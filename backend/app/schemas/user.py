import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# User Profile
class UserProfileBase(BaseModel):
    display_name: str | None = None
    age: int = Field(default=19, ge=10, le=120)
    height_cm: float = Field(default=167.0, ge=50.0, le=280.0)
    current_weight_kg: float = Field(default=53.0, ge=20.0, le=300.0)
    timezone: str = "Asia/Kolkata"
    preferred_language: str = "English"

class UserProfileUpdate(BaseModel):
    display_name: str | None = None
    age: int | None = Field(default=None, ge=10, le=120)
    height_cm: float | None = Field(default=None, ge=50.0, le=280.0)
    current_weight_kg: float | None = Field(default=None, ge=20.0, le=300.0)
    timezone: str | None = None
    preferred_language: str | None = None

class UserProfileResponse(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# User Goals
class UserGoalBase(BaseModel):
    target_weight_kg: float = Field(default=60.0, ge=20.0, le=300.0)
    daily_protein_target_g: float = Field(default=85.0, ge=10.0, le=500.0)
    running_target_km: float = Field(default=5.0, ge=0.5, le=100.0)
    daily_calorie_target: float | None = Field(default=None, ge=500.0, le=10000.0)

class UserGoalUpdate(BaseModel):
    target_weight_kg: float | None = Field(default=None, ge=20.0, le=300.0)
    daily_protein_target_g: float | None = Field(default=None, ge=10.0, le=500.0)
    running_target_km: float | None = Field(default=None, ge=0.5, le=100.0)
    daily_calorie_target: float | None = Field(default=None, ge=500.0, le=10000.0)

class UserGoalResponse(UserGoalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# User & Auth
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

class VerifyEmailRequest(BaseModel):
    token: str
    email: EmailStr | None = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
    confirm_new_password: str = Field(min_length=8)

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8)

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    is_active: bool
    is_verified: bool = True
    profile: UserProfileResponse | None = None
    goals: UserGoalResponse | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str
