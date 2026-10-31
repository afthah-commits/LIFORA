import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.workout import (
    Exercise,
    WorkoutExercise,
    WorkoutSession,
    WorkoutTemplate,
    WorkoutTemplateItem,
)
from backend.app.schemas.workout import (
    ExerciseCreate,
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutTemplateCreate,
)

INITIAL_EXERCISES = [
    # Dumbbells
    {"name": "Dumbbell Bench Press", "category": "Dumbbells", "target_muscle": "Chest", "description": "Flat bench press using dumbbells for balanced pectoral development."},
    {"name": "Incline Dumbbell Press", "category": "Dumbbells", "target_muscle": "Upper Chest", "description": "30-45 degree incline dumbbell chest press."},
    {"name": "Dumbbell Bicep Curl", "category": "Dumbbells", "target_muscle": "Biceps", "description": "Standing alternating dumbbell curls with supination."},
    {"name": "Dumbbell Lateral Raise", "category": "Dumbbells", "target_muscle": "Lateral Deltoids", "description": "Shoulder lateral flyes with slight forward lean."},
    {"name": "Dumbbell Overhead Shoulder Press", "category": "Dumbbells", "target_muscle": "Shoulders", "description": "Seated or standing vertical shoulder press."},
    {"name": "Dumbbell Goblet Squat", "category": "Dumbbells", "target_muscle": "Quadriceps & Glutes", "description": "Squat holding dumbbell vertically against chest."},
    {"name": "Dumbbell Romanian Deadlift (RDL)", "category": "Dumbbells", "target_muscle": "Hamstrings & Glutes", "description": "Hip hinge keeping dumbbells close to shins."},
    {"name": "Single-Arm Dumbbell Row", "category": "Dumbbells", "target_muscle": "Lats & Upper Back", "description": "Supported knee-on-bench one arm dumbbell row."},

    # Bodyweight
    {"name": "Push-ups", "category": "Bodyweight", "target_muscle": "Chest & Triceps", "description": "Standard plank-position chest press."},
    {"name": "Pull-ups / Chin-ups", "category": "Bodyweight", "target_muscle": "Lats & Biceps", "description": "Overhand or underhand grip bodyweight vertical pull."},
    {"name": "Bodyweight Dips", "category": "Bodyweight", "target_muscle": "Triceps & Chest", "description": "Parallel bar dips focusing on elbow flexion."},
    {"name": "Plank", "category": "Bodyweight", "target_muscle": "Core & Abs", "description": "Isometric forearm plank core stability exercise."},
    {"name": "Hanging Knee / Leg Raises", "category": "Bodyweight", "target_muscle": "Lower Abs", "description": "Hanging from bar raising knees to 90 degrees or straight legs."},
    {"name": "Bodyweight Squats", "category": "Bodyweight", "target_muscle": "Quads & Glutes", "description": "Air squats with full depth and knee tracking."},

    # Resistance bands
    {"name": "Band Pull-Aparts", "category": "Resistance bands", "target_muscle": "Rear Delts & Upper Back", "description": "Horizontal chest-level pull apart for scapular retraction."},
    {"name": "Band Face Pulls", "category": "Resistance bands", "target_muscle": "Rear Deltoids & Rotator Cuff", "description": "High anchor pulling band toward forehead with external rotation."},
    {"name": "Band Assisted Pull-ups", "category": "Resistance bands", "target_muscle": "Lats", "description": "Looping long resistance band under foot for assistance."},
    {"name": "Band Bicep Curls", "category": "Resistance bands", "target_muscle": "Biceps", "description": "Stepping on loop band and performing elbow curls."},

    # General strength
    {"name": "Barbell Deadlift", "category": "General strength", "target_muscle": "Posterior Chain", "description": "Conventional or sumo barbell floor pull."},
    {"name": "Barbell Back Squat", "category": "General strength", "target_muscle": "Quadriceps & Core", "description": "Back squat under barbell to parallel depth."},
]

class WorkoutService:
    @staticmethod
    async def seed_initial_exercises(session: AsyncSession) -> None:
        count_q = select(func.count(Exercise.id))
        count_res = await session.execute(count_q)
        if (count_res.scalar_one() or 0) == 0:
            for item in INITIAL_EXERCISES:
                ex = Exercise(
                    name=item["name"],
                    category=item["category"],
                    target_muscle=item["target_muscle"],
                    description=item["description"],
                    is_custom=False
                )
                session.add(ex)
            await session.flush()

    @staticmethod
    async def get_exercises(session: AsyncSession, search: str | None = None, category: str | None = None, user_id: uuid.UUID | None = None) -> list[Exercise]:
        await WorkoutService.seed_initial_exercises(session)
        query = select(Exercise)
        conditions = []
        if search:
            conditions.append(Exercise.name.ilike(f"%{search.strip()}%"))
        if category and category != "All":
            conditions.append(Exercise.category == category)
        if user_id:
            conditions.append(or_(Exercise.is_custom == False, Exercise.created_by_id == user_id))
        else:
            conditions.append(Exercise.is_custom == False)

        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Exercise.category.asc(), Exercise.name.asc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def create_exercise(session: AsyncSession, user_id: uuid.UUID, data: ExerciseCreate) -> Exercise:
        exercise = Exercise(
            name=data.name.strip(),
            category=data.category,
            target_muscle=data.target_muscle.strip(),
            description=data.description,
            is_custom=True,
            created_by_id=user_id
        )
        session.add(exercise)
        await session.flush()
        return exercise

    @staticmethod
    async def create_workout_session(session: AsyncSession, user_id: uuid.UUID, data: WorkoutSessionCreate) -> WorkoutSession:
        workout = WorkoutSession(
            user_id=user_id,
            name=data.name.strip(),
            date=data.date,
            duration_minutes=data.duration_minutes,
            notes=data.notes
        )
        session.add(workout)
        await session.flush()

        for idx, ex_data in enumerate(data.exercises):
            ex_item = WorkoutExercise(
                session_id=workout.id,
                exercise_id=ex_data.exercise_id,
                exercise_name=ex_data.exercise_name,
                sets=ex_data.sets,
                reps=ex_data.reps,
                weight_kg=ex_data.weight_kg,
                duration_minutes=ex_data.duration_minutes,
                notes=ex_data.notes,
                order_index=idx
            )
            session.add(ex_item)

        await session.flush()
        await session.refresh(workout)
        return workout

    @staticmethod
    async def get_workout_sessions(session: AsyncSession, user_id: uuid.UUID, limit: int = 50) -> list[WorkoutSessionResponse]:
        query = select(WorkoutSession).where(
            WorkoutSession.user_id == user_id
        ).order_by(WorkoutSession.date.desc(), WorkoutSession.created_at.desc()).limit(limit)
        result = await session.execute(query)
        sessions = result.scalars().all()

        responses = []
        for s in sessions:
            resp = WorkoutSessionResponse.model_validate(s)
            resp.total_sets = sum(e.sets for e in s.exercises)
            resp.total_volume_kg = round(sum(e.sets * e.reps * e.weight_kg for e in s.exercises), 1)
            responses.append(resp)
        return responses

    @staticmethod
    async def get_workout_session(session: AsyncSession, user_id: uuid.UUID, session_id: uuid.UUID) -> WorkoutSessionResponse | None:
        query = select(WorkoutSession).where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == user_id
        )
        result = await session.execute(query)
        s = result.scalar_one_or_none()
        if not s:
            return None
        resp = WorkoutSessionResponse.model_validate(s)
        resp.total_sets = sum(e.sets for e in s.exercises)
        resp.total_volume_kg = round(sum(e.sets * e.reps * e.weight_kg for e in s.exercises), 1)
        return resp

    @staticmethod
    async def delete_workout_session(session: AsyncSession, user_id: uuid.UUID, session_id: uuid.UUID) -> bool:
        query = select(WorkoutSession).where(WorkoutSession.id == session_id, WorkoutSession.user_id == user_id)
        result = await session.execute(query)
        session_obj = result.scalar_one_or_none()
        if not session_obj:
            return False
        await session.delete(session_obj)
        await session.flush()
        return True

    # Templates
    @staticmethod
    async def create_template(session: AsyncSession, user_id: uuid.UUID, data: WorkoutTemplateCreate) -> WorkoutTemplate:
        template = WorkoutTemplate(
            user_id=user_id,
            name=data.name.strip(),
            description=data.description
        )
        session.add(template)
        await session.flush()

        for idx, item in enumerate(data.items):
            tpl_item = WorkoutTemplateItem(
                template_id=template.id,
                exercise_id=item.exercise_id,
                sets=item.sets,
                reps=item.reps,
                target_weight_kg=item.target_weight_kg,
                order_index=idx
            )
            session.add(tpl_item)

        await session.flush()
        await session.refresh(template)
        return template

    @staticmethod
    async def get_templates(session: AsyncSession, user_id: uuid.UUID) -> list[WorkoutTemplate]:
        query = select(WorkoutTemplate).where(WorkoutTemplate.user_id == user_id).order_by(WorkoutTemplate.created_at.desc())
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def delete_template(session: AsyncSession, user_id: uuid.UUID, template_id: uuid.UUID) -> bool:
        query = select(WorkoutTemplate).where(WorkoutTemplate.id == template_id, WorkoutTemplate.user_id == user_id)
        result = await session.execute(query)
        tpl = result.scalar_one_or_none()
        if not tpl:
            return False
        await session.delete(tpl)
        await session.flush()
        return True
