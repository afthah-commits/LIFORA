import hashlib
import io
import os
import re
import uuid
from datetime import date as dt_date, timedelta
from PIL import Image
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.screentime import ScreenTimeImport, ScreenTimeSession
from backend.app.schemas.screentime import (
    ExtractedScreenTimeItem,
    ScreenTimeImportConfirmRequest,
    ScreenTimeImportHistoryItem,
    ScreenTimeImportReviewResponse,
)

# Global or lazy RapidOCR instance
_ocr_engine = None


def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        from rapidocr_onnxruntime import RapidOCR

        _ocr_engine = RapidOCR()
    return _ocr_engine


APP_CATEGORY_MAP = {
    # Social Media
    "instagram": "Social Media",
    "facebook": "Social Media",
    "twitter": "Social Media",
    "x": "Social Media",
    "threads": "Social Media",
    "snapchat": "Social Media",
    "linkedin": "Social Media",
    "reddit": "Social Media",
    "pinterest": "Social Media",
    "tiktok": "Social Media",
    # Entertainment
    "youtube": "Entertainment",
    "netflix": "Entertainment",
    "spotify": "Entertainment",
    "prime video": "Entertainment",
    "hotstar": "Entertainment",
    "disney+": "Entertainment",
    "twitch": "Entertainment",
    "vlc": "Entertainment",
    "crunchyroll": "Entertainment",
    # Communication
    "whatsapp": "Communication",
    "telegram": "Communication",
    "signal": "Communication",
    "messages": "Communication",
    "phone": "Communication",
    "zoom": "Communication",
    "teams": "Communication",
    "meet": "Communication",
    "discord": "Communication",
    # Productivity
    "chrome": "Productivity",
    "safari": "Productivity",
    "gmail": "Productivity",
    "google drive": "Productivity",
    "notion": "Productivity",
    "slack": "Productivity",
    "github": "Productivity",
    "google docs": "Productivity",
    "google sheets": "Productivity",
    "keep notes": "Productivity",
    "obsidian": "Productivity",
    "calendar": "Productivity",
    # Education
    "duolingo": "Education",
    "coursera": "Education",
    "udemy": "Education",
    "kindle": "Education",
    "books": "Education",
    "khan academy": "Education",
}

IGNORE_KEYWORDS = {
    "screen time",
    "digital wellbeing",
    "parental controls",
    "dashboard",
    "daily average",
    "set timer",
    "unlocks",
    "notifications",
    "manage your data",
    "bedtime mode",
    "focus mode",
    "see all apps",
    "app timers",
    "show all",
    "total",
    "today",
    "yesterday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "monday",
    "tuesday",
}


class ScreenTimeOcrService:
    @staticmethod
    def categorize_app(app_name: str) -> str:
        name_lower = app_name.lower().strip()
        for key, cat in APP_CATEGORY_MAP.items():
            if key in name_lower:
                return cat
        return "Other"

    @staticmethod
    def format_minutes(mins: int) -> str:
        h = mins // 60
        m = mins % 60
        if h > 0 and m > 0:
            return f"{h}h {m}m"
        elif h > 0:
            return f"{h}h"
        return f"{m}m"

    @classmethod
    def parse_duration(cls, text: str) -> int:
        clean = text.lower().strip()

        # Pattern 1: "2 hr 15 min", "1 hr 30 mins", "2h 45m", "1 hour 20 minutes"
        m1 = re.search(
            r"(\d+)\s*(?:hr|hrs|h|hour|hours)\s*(\d+)?\s*(?:min|mins|m|minute|minutes)?",
            clean,
        )
        if m1:
            h = int(m1.group(1))
            m = int(m1.group(2)) if m1.group(2) else 0
            return h * 60 + m

        # Pattern 2: "45 min", "35 mins", "45m", "50 minutes"
        m2 = re.search(r"(\d+)\s*(?:min|mins|m|minute|minutes)", clean)
        if m2:
            return int(m2.group(1))

        # Pattern 3: "02:15" or "1:45"
        m3 = re.search(r"^(\d{1,2}):(\d{2})$", clean)
        if m3:
            h = int(m3.group(1))
            m = int(m3.group(2))
            return h * 60 + m

        return 0

    @staticmethod
    def parse_date_from_text(text: str) -> dt_date:
        lower = text.lower()
        if "yesterday" in lower:
            return dt_date.today() - timedelta(days=1)
        # Check standard months (Jan, Feb, Mar, etc.)
        months = [
            ("jan", 1),
            ("feb", 2),
            ("mar", 3),
            ("apr", 4),
            ("may", 5),
            ("jun", 6),
            ("jul", 7),
            ("aug", 8),
            ("sep", 9),
            ("oct", 10),
            ("nov", 11),
            ("dec", 12),
        ]
        for m_str, m_num in months:
            m_match = re.search(rf"{m_str}\w*\s+(\d{{1,2}})", lower)
            if m_match:
                day = int(m_match.group(1))
                try:
                    return dt_date(dt_date.today().year, m_num, day)
                except ValueError:
                    pass
        return dt_date.today()

    @classmethod
    def preprocess_image(cls, file_bytes: bytes) -> tuple[object, str]:
        # Compute sha256 hash
        hash_sha256 = hashlib.sha256(file_bytes).hexdigest()

        # Load with PIL to handle rotation and color spaces
        pil_img = Image.open(io.BytesIO(file_bytes))
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        w, h = pil_img.size
        if w > 1600:
            scale = 1600.0 / w
            new_w = 1600
            new_h = int(h * scale)
            pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        try:
            import numpy as np

            img_np = np.array(pil_img)
            return img_np, hash_sha256
        except ImportError:
            return pil_img, hash_sha256

    @classmethod
    async def process_screenshot_upload(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        file_bytes: bytes,
        original_filename: str,
        target_date_override: dt_date | None = None,
    ) -> ScreenTimeImportReviewResponse:
        # Preprocess and compute hash
        img_np, file_hash = cls.preprocess_image(file_bytes)

        # Check duplicate import
        dup_query = select(ScreenTimeImport).where(
            ScreenTimeImport.user_id == user_id,
            ScreenTimeImport.image_hash == file_hash,
            ScreenTimeImport.status == "confirmed",
        )
        dup_res = await db.execute(dup_query)
        existing = dup_res.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"This screenshot was already imported on {existing.import_date} with {existing.app_count} applications. Duplicate imports are prevented.",
            )

        # Save processed image to disk
        ext = os.path.splitext(original_filename)[1] or ".jpg"
        save_filename = f"screentime_{uuid.uuid4()}{ext}"
        save_path = os.path.join(settings.UPLOAD_DIR, save_filename)
        try:
            import cv2
            import numpy as np

            if isinstance(img_np, np.ndarray):
                cv2.imwrite(save_path, cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR))
            else:
                img_np.save(save_path)
        except Exception:
            pil_fallback = Image.open(io.BytesIO(file_bytes))
            pil_fallback.save(save_path)

        # Run OCR Engine
        ocr = get_ocr_engine()
        ocr_result, _ = ocr(img_np)

        raw_lines: list[str] = []
        if ocr_result:
            for item in ocr_result:
                # item structure: [box, text, confidence]
                if len(item) >= 2:
                    text = item[1].strip()
                    if text:
                        raw_lines.append(text)

        raw_text_full = "\n".join(raw_lines)
        detected_date = target_date_override or cls.parse_date_from_text(raw_text_full)

        # Extract app names and durations
        extracted_items: list[ExtractedScreenTimeItem] = []
        seen_apps = set()

        i = 0
        while i < len(raw_lines):
            line = raw_lines[i]
            dur = cls.parse_duration(line)

            if dur > 0:
                # The line itself might be "Instagram 1 hr 25 min"
                parts = line.split()
                app_candidate = ""
                # Check if app name is in the same line before duration
                for p_idx in range(len(parts)):
                    part_str = " ".join(parts[:p_idx])
                    rem_str = " ".join(parts[p_idx:])
                    if cls.parse_duration(rem_str) > 0 and part_str.strip():
                        app_candidate = part_str.strip()
                        break

                # If not in same line, look at preceding line
                if not app_candidate and i > 0:
                    prev_line = raw_lines[i - 1].strip()
                    if prev_line.lower() not in IGNORE_KEYWORDS and len(prev_line) > 1:
                        app_candidate = prev_line

                # Validate candidate
                if (
                    app_candidate
                    and app_candidate.lower() not in IGNORE_KEYWORDS
                    and app_candidate.lower() not in seen_apps
                    and not bool(re.match(r"^\d+[\s\w]*$", app_candidate))
                ):
                    seen_apps.add(app_candidate.lower())
                    cat = cls.categorize_app(app_candidate)
                    extracted_items.append(
                        ExtractedScreenTimeItem(
                            app_name=app_candidate,
                            category=cat,
                            duration_minutes=dur,
                            duration_formatted=cls.format_minutes(dur),
                            confidence=0.92,
                        )
                    )

            i += 1

        total_mins = sum(item.duration_minutes for item in extracted_items)

        # Create pending import record
        import_record = ScreenTimeImport(
            user_id=user_id,
            image_path=save_filename,
            image_hash=file_hash,
            import_date=dt_date.today(),
            target_date=detected_date,
            status="pending_review",
            app_count=len(extracted_items),
            total_duration_minutes=total_mins,
            raw_ocr_text=raw_text_full,
            extracted_data=[item.model_dump() for item in extracted_items],
        )
        db.add(import_record)
        await db.commit()
        await db.refresh(import_record)

        msg = None
        if not extracted_items:
            msg = "No clear application usage lines could be identified from this screenshot. You may add applications manually in the review table before saving."

        return ScreenTimeImportReviewResponse(
            id=import_record.id,
            image_url=f"/api/v1/screen-time/images/{save_filename}",
            detected_date=detected_date,
            total_detected_minutes=total_mins,
            total_formatted=cls.format_minutes(total_mins),
            status=import_record.status,
            items=extracted_items,
            raw_text=raw_text_full,
            message=msg,
        )

    @classmethod
    async def confirm_screen_time_import(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        import_id: uuid.UUID,
        req: ScreenTimeImportConfirmRequest,
    ) -> ScreenTimeImportReviewResponse:
        import_q = select(ScreenTimeImport).where(
            ScreenTimeImport.id == import_id, ScreenTimeImport.user_id == user_id
        )
        res = await db.execute(import_q)
        import_rec = res.scalar_one_or_none()
        if not import_rec:
            raise HTTPException(status_code=404, detail="Import session not found")

        total_mins = 0
        saved_items: list[ExtractedScreenTimeItem] = []

        for item in req.items:
            if item.duration_minutes <= 0 or not item.app_name.strip():
                continue

            app_name = item.app_name.strip()
            # Upsert into ScreenTimeSession to prevent duplicates on same date
            sess_q = select(ScreenTimeSession).where(
                ScreenTimeSession.user_id == user_id,
                ScreenTimeSession.date == req.target_date,
                ScreenTimeSession.app_name == app_name,
            )
            sess_res = await db.execute(sess_q)
            existing_sess = sess_res.scalar_one_or_none()

            if existing_sess:
                existing_sess.duration_minutes = item.duration_minutes
                existing_sess.category = item.category
                existing_sess.notes = item.notes
                existing_sess.import_id = import_id
                existing_sess.is_synced = False
            else:
                new_sess = ScreenTimeSession(
                    user_id=user_id,
                    date=req.target_date,
                    app_name=app_name,
                    category=item.category,
                    duration_minutes=item.duration_minutes,
                    notes=item.notes,
                    is_synced=False,
                    import_id=import_id,
                )
                db.add(new_sess)

            total_mins += item.duration_minutes
            saved_items.append(
                ExtractedScreenTimeItem(
                    app_name=app_name,
                    category=item.category,
                    duration_minutes=item.duration_minutes,
                    duration_formatted=cls.format_minutes(item.duration_minutes),
                    confidence=1.0,
                )
            )

        import_rec.status = "confirmed"
        import_rec.target_date = req.target_date
        import_rec.app_count = len(saved_items)
        import_rec.total_duration_minutes = total_mins
        import_rec.extracted_data = [i.model_dump() for i in saved_items]

        await db.commit()
        await db.refresh(import_rec)

        return ScreenTimeImportReviewResponse(
            id=import_rec.id,
            image_url=f"/api/v1/screen-time/images/{import_rec.image_path}",
            detected_date=req.target_date,
            total_detected_minutes=total_mins,
            total_formatted=cls.format_minutes(total_mins),
            status="confirmed",
            items=saved_items,
            raw_text=import_rec.raw_ocr_text,
            message="Successfully confirmed and saved screen time records.",
        )

    @classmethod
    async def get_import_history(
        cls, db: AsyncSession, user_id: uuid.UUID
    ) -> list[ScreenTimeImportHistoryItem]:
        query = (
            select(ScreenTimeImport)
            .where(ScreenTimeImport.user_id == user_id)
            .order_by(ScreenTimeImport.created_at.desc())
        )
        res = await db.execute(query)
        records = list(res.scalars().all())

        history: list[ScreenTimeImportHistoryItem] = []
        for r in records:
            history.append(
                ScreenTimeImportHistoryItem(
                    id=r.id,
                    import_date=r.import_date,
                    target_date=r.target_date,
                    image_url=f"/api/v1/screen-time/images/{r.image_path}",
                    status=r.status,
                    app_count=r.app_count,
                    total_duration_minutes=r.total_duration_minutes,
                    created_at=r.created_at,
                )
            )
        return history
