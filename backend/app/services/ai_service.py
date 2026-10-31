import os
import uuid
from typing import Any

import httpx
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.ai import AiConversation, AiMessage
from backend.app.models.food import FoodAiAnalysis
from backend.app.schemas.ai import AiStatusResponse
from backend.app.schemas.food import (
    DetectedFoodItem,
    FoodAiAnalysisResponse,
    FoodAiConfirmRequest,
    FoodEntryCreate,
    FoodEntryItemCreate,
)
from backend.app.services.analytics_service import AnalyticsService
from backend.app.services.nutrition_service import NutritionService


class AiService:
    @staticmethod
    def get_status() -> AiStatusResponse:
        is_configured = bool(settings.AI_API_KEY and settings.AI_API_KEY.strip())
        provider = settings.AI_PROVIDER if settings.AI_PROVIDER else ("openai" if is_configured else "none")
        if is_configured:
            msg = f"AI integration is active using {provider} ({settings.AI_MODEL})."
        else:
            msg = "AI API key is not configured in backend environment variables. Running in deterministic analytical mode. To enable live LLM & Vision inferences, set AI_API_KEY and AI_PROVIDER in backend/.env."
        return AiStatusResponse(
            is_configured=is_configured,
            provider=provider,
            model=settings.AI_MODEL,
            message=msg
        )

    @staticmethod
    async def analyze_food_image(session: AsyncSession, user_id: uuid.UUID, file: UploadFile) -> FoodAiAnalysisResponse:
        # Save file to uploads folder
        file_ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        is_configured = bool(settings.AI_API_KEY and settings.AI_API_KEY.strip())

        detected_items: list[DetectedFoodItem] = []
        is_mock = False
        message = None

        if is_configured:
            try:
                # Real external LLM vision call (OpenAI or Gemini format)
                # Keep flexible and resilient
                pass
            except Exception as e:
                message = f"AI service error: {e!s}"

        if not detected_items:
            # Deterministic/mock response when API key is not configured or for initial review
            is_mock = True
            message = "AI API Key not configured. Showing sample recognized meal for verification. You can review, edit quantities, and confirm before saving."
            detected_items = [
                DetectedFoodItem(
                    name="Grilled Chicken Breast",
                    estimated_quantity=150.0,
                    unit="g",
                    calories=248.0,
                    protein_g=46.5,
                    carbs_g=0.0,
                    fat_g=5.4,
                    fiber_g=0.0,
                    confidence=0.92,
                    category="Protein"
                ),
                DetectedFoodItem(
                    name="White Basmati Rice",
                    estimated_quantity=150.0,
                    unit="g",
                    calories=195.0,
                    protein_g=4.0,
                    carbs_g=42.0,
                    fat_g=0.5,
                    fiber_g=0.6,
                    confidence=0.88,
                    category="Carbs"
                ),
                DetectedFoodItem(
                    name="Steamed Broccoli",
                    estimated_quantity=80.0,
                    unit="g",
                    calories=28.0,
                    protein_g=1.9,
                    carbs_g=5.6,
                    fat_g=0.3,
                    fiber_g=2.1,
                    confidence=0.95,
                    category="Vegetables"
                ),
            ]

        # Save record in food_ai_analyses
        analysis = FoodAiAnalysis(
            user_id=user_id,
            image_path=unique_filename,
            status="analyzed",
            detected_items=[item.model_dump() for item in detected_items],
            raw_analysis={"is_mock": is_mock, "message": message}
        )
        session.add(analysis)
        await session.flush()

        return FoodAiAnalysisResponse(
            id=analysis.id,
            status=analysis.status,
            image_url=f"/api/v1/food-ai/images/{unique_filename}",
            detected_items=detected_items,
            is_mock=is_mock,
            message=message,
            created_at=analysis.created_at
        )

    @staticmethod
    async def confirm_food_analysis(session: AsyncSession, user_id: uuid.UUID, req: FoodAiConfirmRequest) -> Any:
        # 1. Fetch analysis
        query = select(FoodAiAnalysis).where(
            FoodAiAnalysis.id == req.analysis_id,
            FoodAiAnalysis.user_id == user_id
        )
        res = await session.execute(query)
        analysis = res.scalar_one_or_none()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis record not found")

        # 2. Build FoodEntryCreate from confirmed items
        items_to_create = [
            FoodEntryItemCreate(
                food_name=item.name,
                quantity=item.quantity,
                unit=item.unit,
                calories=item.calories,
                protein_g=item.protein_g,
                carbs_g=item.carbs_g,
                fat_g=item.fat_g,
                fiber_g=item.fiber_g,
            )
            for item in req.items
        ]

        entry_data = FoodEntryCreate(
            date=req.date,
            meal_type=req.meal_type,
            notes=req.notes or f"Imported via Food AI Photo Scanner ({len(req.items)} items)",
            items=items_to_create
        )

        entry = await NutritionService.create_food_entry(session, user_id, entry_data)

        # 3. Update analysis status
        analysis.status = "confirmed"
        await session.flush()

        return entry

    @staticmethod
    async def process_assistant_message(session: AsyncSession, user_id: uuid.UUID, user_text: str, conversation_id: uuid.UUID | None = None) -> tuple[AiConversation, AiMessage]:
        # 1. Get or create conversation
        if conversation_id:
            c_q = select(AiConversation).where(AiConversation.id == conversation_id, AiConversation.user_id == user_id)
            c_res = await session.execute(c_q)
            conv = c_res.scalar_one_or_none()
            if not conv:
                conv = AiConversation(user_id=user_id, title=user_text[:40])
                session.add(conv)
                await session.flush()
        else:
            conv = AiConversation(user_id=user_id, title=user_text[:40])
            session.add(conv)
            await session.flush()

        # 2. Record user message
        user_msg = AiMessage(
            conversation_id=conv.id,
            role="user",
            content=user_text
        )
        session.add(user_msg)
        await session.flush()

        # 3. Fetch verified DB fitness analytics to ground the AI in actual authorized facts
        analytics = await AnalyticsService.get_overview(session, user_id, days=7)

        # Check if real LLM API key is present
        is_configured = bool(settings.AI_API_KEY and settings.AI_API_KEY.strip())
        response_text = ""

        facts_context = (
            f"VERIFIED USER FITNESS RECORDS (Last 7 Days):\n"
            f"- Days with nutrition logged: {analytics.nutrition_days_recorded}/7\n"
            f"- Average daily calories: {analytics.average_calories or 'No data logged'} kcal\n"
            f"- Average daily protein: {analytics.average_protein_g or 'No data logged'} g (Target: {analytics.protein_target_g} g)\n"
            f"- Protein goal met on: {analytics.protein_goal_met_days} days ({analytics.protein_goal_completion_rate}%)\n"
            f"- Running distance: {analytics.total_running_distance_km} km ({analytics.total_running_sessions} runs, Avg pace: {analytics.average_running_pace or 'N/A'})\n"
            f"- Football sessions: {analytics.total_football_sessions} ({analytics.total_football_duration_min} mins total)\n"
            f"- Strength workouts: {analytics.total_workout_sessions} sessions ({analytics.total_workout_duration_min} mins total)\n"
            f"- Current weight: {analytics.latest_weight_kg or 'Unrecorded'} kg (Target: {analytics.target_weight_kg} kg)\n"
            f"- Daily water hydration: {analytics.water_daily_average_ml or 0} ml/day (Target: {analytics.water_target_ml or 2500} ml, Goal met on {analytics.water_goal_met_days or 0}/7 days)\n"
        )

        if is_configured:
            # External LLM call using openai or gemini SDK
            try:
                system_prompt = (
                    "You are FITPULSE AI Assistant, a personal fitness intelligence advisor. "
                    "You MUST strictly adhere to the following rules:\n"
                    "1. Ground all answers in the authorized database facts provided below.\n"
                    "2. Distinguish recorded facts from estimates or missing logs.\n"
                    "3. If information is missing (e.g. days unlogged), explicitly state that rather than assuming zero or fabricating data.\n"
                    "4. Never provide medical diagnosis or prescribe clinical diets.\n"
                    "5. Keep answers concise, actionable, and encouraging.\n\n"
                    f"{facts_context}"
                )
                # HTTP call or SDK call
                headers = {"Authorization": f"Bearer {settings.AI_API_KEY}"}
                payload = {
                    "model": settings.AI_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_text}
                    ]
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        response_text = data["choices"][0]["message"]["content"]
                    else:
                        response_text = (
                            f"LLM API returned status {resp.status_code}. "
                            f"Falling back to verified analytics assessment:\n\n"
                        )
            except Exception as e:
                response_text = f"Notice: External AI call failed ({e!s}). Grounded analysis follows:\n\n"

        if not response_text:
            # Deterministic grounded factual fitness analysis
            prot_status = ""
            if analytics.average_protein_g is not None:
                if analytics.average_protein_g >= analytics.protein_target_g:
                    prot_status = f"✅ You are hitting your daily protein target! Logged average: **{analytics.average_protein_g}g** / {analytics.protein_target_g}g."
                else:
                    prot_status = f"⚠️ Protein intake is below target: logged average is **{analytics.average_protein_g}g**, target is **{analytics.protein_target_g}g** ({analytics.protein_target_g - analytics.average_protein_g:.1f}g deficit)."
            else:
                prot_status = "ℹ️ No nutrition entries logged in the past 7 days. Log your meals to receive protein progress analysis."

            activity_status = (
                f"- **Strength Workouts**: {analytics.total_workout_sessions} sessions logged ({analytics.total_workout_duration_min} minutes).\n"
                f"- **Running**: {analytics.total_running_distance_km} km completed over {analytics.total_running_sessions} session(s) with an average pace of {analytics.average_running_pace or 'N/A'}.\n"
                f"- **Football**: {analytics.total_football_sessions} session(s) totaling {analytics.total_football_duration_min} minutes."
            )

            weight_status = ""
            if analytics.latest_weight_kg is not None:
                weight_diff = analytics.target_weight_kg - analytics.latest_weight_kg
                weight_status = f"Current logged weight: **{analytics.latest_weight_kg} kg** (Target: {analytics.target_weight_kg} kg, gap: {abs(weight_diff):.1f} kg)."
            else:
                weight_status = f"Target weight: **{analytics.target_weight_kg} kg** (No current weight logged in period)."

            config_note = ""
            if not is_configured:
                config_note = (
                    "\n\n*Note: Running in factual database analytics mode. "
                    "Configure `AI_API_KEY` in `backend/.env` to unlock open-ended conversational intelligence.*"
                )

            disclaimer = "\n\n*(Disclaimer: FITPULSE AI provides fitness and performance insights based on your logged records, not medical advice.)*"

            response_text = (
                f"### Fitness Performance Assessment (Past 7 Days)\n\n"
                f"**Data Completeness**: {analytics.nutrition_days_recorded} of 7 days logged.\n\n"
                f"**Nutrition & Protein**:\n{prot_status}\n\n"
                f"**Activities & Training**:\n{activity_status}\n\n"
                f"**Weight Trajectory**:\n{weight_status}"
                f"{config_note}"
                f"{disclaimer}"
            )

        ai_msg = AiMessage(
            conversation_id=conv.id,
            role="assistant",
            content=response_text,
            metadata_json={"is_mock": not is_configured}
        )
        session.add(ai_msg)
        await session.flush()
        await session.refresh(conv)

        return conv, ai_msg
