from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.v1.router import api_router
from backend.app.core.config import settings
from backend.app.core.database import AsyncSessionLocal
from backend.app.services.nutrition_service import NutritionService
from backend.app.services.workout_service import WorkoutService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed master foods and exercises
    async with AsyncSessionLocal() as session:
        try:
            await NutritionService.seed_initial_foods(session)
            await WorkoutService.seed_initial_exercises(session)
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"Startup seed notice: {e}")
    yield
    # Shutdown logic if needed

is_production = settings.ENVIRONMENT.lower() == "production"
docs_enabled = not is_production or settings.ENABLE_DOCS

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="LIFORA – Personal Life Operating System API. Your Life. Your Space. Your Rules.",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if docs_enabled else None,
    docs_url=f"{settings.API_V1_STR}/docs" if docs_enabled else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if docs_enabled else None,
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

# In development/local LAN mode, allow RFC-1918 local network IP addresses
lan_origin_regex = (
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$"
    if not is_production
    else None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=lan_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers for consistent error responses
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(x) for x in err.get("loc", [])])
        msg = err.get("msg", "Invalid value")
        errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors}
    )

# Include v1 API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "tagline": "Your Life. Your Space. Your Rules.",
        "docs": f"{settings.API_V1_STR}/docs",
        "status": "online"
    }
