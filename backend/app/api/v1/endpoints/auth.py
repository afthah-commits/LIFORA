from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.user import (
    ForgotPasswordRequest,
    PasswordChangeRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    VerifyEmailRequest,
)
from backend.app.core.config import settings
from backend.app.services.auth_service import AuthService
from backend.app.services.email_service import EmailService

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    user, verification_token = await AuthService.register_user(
        db, req.email, req.password, req.confirm_password
    )
    # Dispatch verification email via EmailService
    await EmailService.send_verification_email(user.email, verification_token)

    is_prod = settings.ENVIRONMENT.lower() == "production"
    response_data = {
        "message": "Account created successfully. Please verify your email.",
        "user": UserResponse.model_validate(user),
    }
    # Only return direct token in non-production environments for local testing
    if not is_prod:
        response_data["verification_token"] = verification_token
        response_data["verification_url"] = f"/verify-email?token={verification_token}"

    return response_data

@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.verify_email(db, req.token, req.email)
    access_token, refresh_token = await AuthService.create_tokens_for_user(db, user)
    return {
        "message": "Email verified successfully.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    reset_token = await AuthService.forgot_password(db, req.email)
    if reset_token:
        await EmailService.send_password_reset_email(req.email, reset_token)

    is_prod = settings.ENVIRONMENT.lower() == "production"
    response_data = {
        "message": "If this email is registered, password reset instructions have been generated.",
    }
    # Only expose raw token in non-production environments
    if not is_prod and reset_token:
        response_data["reset_token"] = reset_token
        response_data["reset_url"] = f"/reset-password?token={reset_token}"

    return response_data

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.reset_password(db, req.token, req.new_password, req.confirm_new_password)
    return {"message": "Password has been successfully reset. You can now log in with your new password."}


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await AuthService.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token, refresh_token = await AuthService.create_tokens_for_user(db, user)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    new_access_token, new_refresh_token, user = await AuthService.rotate_refresh_token(db, req.refresh_token)
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
async def logout(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.revoke_refresh_token(db, req.refresh_token)
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/change-password")
async def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await AuthService.change_password(db, current_user, req)
    return {"message": "Password changed successfully"}
