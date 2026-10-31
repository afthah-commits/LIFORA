import datetime
import logging
import secrets
import uuid
from datetime import timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from backend.app.models.user import RefreshSession, User, UserGoal, UserProfile
from backend.app.schemas.user import (
    PasswordChangeRequest,
    UserGoalUpdate,
    UserProfileUpdate,
)

logger = logging.getLogger("lifora.auth")


class AuthService:
    @staticmethod
    async def register_user(
        session: AsyncSession, email: str, password: str, confirm_password: str
    ) -> tuple[User, str]:
        if password != confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match",
            )
        norm_email = email.lower().strip()
        query = select(User).where(User.email == norm_email)
        result = await session.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered",
            )

        verification_token = secrets.token_urlsafe(32)
        hashed_pwd = get_password_hash(password)
        user = User(
            email=norm_email,
            hashed_password=hashed_pwd,
            is_active=True,
            is_verified=False,
            verification_token=verification_token,
        )
        session.add(user)
        await session.flush()

        # Create default profile and goals
        default_display_name = norm_email.split("@")[0].capitalize()
        profile = UserProfile(user_id=user.id, display_name=default_display_name)
        session.add(profile)
        goal = UserGoal(user_id=user.id)
        session.add(goal)
        await session.flush()

        logger.info(
            f"[LIFORA AUTH DEV] Verification token for {norm_email}: {verification_token} (URL: /verify-email?token={verification_token})"
        )
        return user, verification_token

    @staticmethod
    async def verify_email(session: AsyncSession, token: str, email: str | None = None) -> User:
        query = select(User).where(User.verification_token == token.strip())
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if not user and email:
            eq = select(User).where(User.email == email.lower().strip())
            er = await session.execute(eq)
            u = er.scalar_one_or_none()
            if u and u.is_verified:
                return u

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token",
            )

        user.is_verified = True
        user.verification_token = None
        await session.flush()
        return user

    @staticmethod
    async def forgot_password(session: AsyncSession, email: str) -> str | None:
        norm_email = email.lower().strip()
        query = select(User).where(User.email == norm_email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            return None

        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires_at = datetime.datetime.now(timezone.utc) + datetime.timedelta(hours=1)
        await session.flush()

        logger.info(
            f"[LIFORA AUTH DEV] Password reset token for {norm_email}: {reset_token} (URL: /reset-password?token={reset_token})"
        )
        return reset_token

    @staticmethod
    async def reset_password(
        session: AsyncSession, token: str, new_password: str, confirm_new_password: str
    ) -> User:
        if new_password != confirm_new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match",
            )

        query = select(User).where(User.reset_token == token.strip())
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        now = datetime.datetime.now(timezone.utc)

        if not user or not user.reset_token_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )

        exp = user.reset_token_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired",
            )

        user.hashed_password = get_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expires_at = None

        # Revoke all sessions on reset
        await session.execute(
            update(RefreshSession).where(RefreshSession.user_id == user.id).values(is_revoked=True)
        )
        await session.flush()
        return user

    @staticmethod
    async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
        query = select(User).where(User.email == email.lower().strip())
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    async def create_tokens_for_user(session: AsyncSession, user: User) -> tuple[str, str]:
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        # Save refresh session in DB
        hashed_rf = hash_token(refresh_token)
        expires_at = datetime.datetime.now(timezone.utc) + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_session = RefreshSession(
            user_id=user.id,
            token_hash=hashed_rf,
            expires_at=expires_at,
            is_revoked=False
        )
        session.add(refresh_session)
        await session.flush()

        return access_token, refresh_token

    @staticmethod
    async def rotate_refresh_token(session: AsyncSession, refresh_token: str) -> tuple[str, str, User]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

        user_id_str = payload.get("sub")
        try:
            user_id = uuid.UUID(user_id_str)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        token_hash = hash_token(refresh_token)
        query = select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
            RefreshSession.user_id == user_id,
            RefreshSession.is_revoked == False
        )
        result = await session.execute(query)
        rf_session = result.scalar_one_or_none()

        if not rf_session:
            # Token reuse detection or revoked: revoke all sessions for safety
            await session.execute(
                update(RefreshSession).where(RefreshSession.user_id == user_id).values(is_revoked=True)
            )
            await session.flush()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or reused refresh token"
            )

        now = datetime.datetime.now(timezone.utc)
        exp = rf_session.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            rf_session.is_revoked = True
            await session.flush()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired"
            )

        # Revoke the old refresh token (Token Rotation)
        rf_session.is_revoked = True

        # Get user
        user_query = select(User).where(User.id == user_id, User.is_active == True)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Issue new pair
        new_access_token = create_access_token(user.id)
        new_refresh_token = create_refresh_token(user.id)
        new_rf_hash = hash_token(new_refresh_token)
        new_expires_at = now + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_rf_session = RefreshSession(
            user_id=user.id,
            token_hash=new_rf_hash,
            expires_at=new_expires_at,
            is_revoked=False
        )
        session.add(new_rf_session)
        await session.flush()

        return new_access_token, new_refresh_token, user

    @staticmethod
    async def revoke_refresh_token(session: AsyncSession, refresh_token: str) -> None:
        token_hash = hash_token(refresh_token)
        query = update(RefreshSession).where(RefreshSession.token_hash == token_hash).values(is_revoked=True)
        await session.execute(query)
        await session.flush()

    @staticmethod
    async def change_password(session: AsyncSession, user: User, req: PasswordChangeRequest) -> None:
        if not verify_password(req.old_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password does not match"
            )
        user.hashed_password = get_password_hash(req.new_password)
        # Revoke all existing sessions so old tokens become invalid
        await session.execute(
            update(RefreshSession).where(RefreshSession.user_id == user.id).values(is_revoked=True)
        )
        await session.flush()

    @staticmethod
    async def update_profile(session: AsyncSession, user: User, update_data: UserProfileUpdate) -> UserProfile:
        query = select(UserProfile).where(UserProfile.user_id == user.id)
        result = await session.execute(query)
        profile = result.scalar_one_or_none()

        if not profile:
            profile = UserProfile(user_id=user.id)
            session.add(profile)

        data_dict = update_data.model_dump(exclude_unset=True)
        for key, val in data_dict.items():
            if val is not None:
                setattr(profile, key, val)

        await session.flush()
        return profile

    @staticmethod
    async def update_goals(session: AsyncSession, user: User, update_data: UserGoalUpdate) -> UserGoal:
        query = select(UserGoal).where(UserGoal.user_id == user.id)
        result = await session.execute(query)
        goal = result.scalar_one_or_none()

        if not goal:
            goal = UserGoal(user_id=user.id)
            session.add(goal)

        data_dict = update_data.model_dump(exclude_unset=True)
        for key, val in data_dict.items():
            setattr(goal, key, val)

        await session.flush()
        return goal
