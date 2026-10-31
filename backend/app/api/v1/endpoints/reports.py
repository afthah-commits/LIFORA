import io

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.services.report_service import ReportService

router = APIRouter()

@router.get("/data")
async def get_report_data(
    days: int = Query(default=7, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await ReportService.generate_report_data(db, current_user.id, days=days)

@router.get("/export/json")
async def export_json_report(
    days: int = Query(default=7, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    import json
    data = await ReportService.generate_report_data(db, current_user.id, days=days)
    filename = f"fitpulse_{data.get('report_type')}_report.json"
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/csv")
async def export_csv_report(
    days: int = Query(default=7, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data = await ReportService.generate_report_data(db, current_user.id, days=days)
    csv_str = ReportService.generate_csv(data)
    filename = f"fitpulse_{data.get('report_type')}_report.csv"
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
async def export_pdf_report(
    days: int = Query(default=7, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data = await ReportService.generate_report_data(db, current_user.id, days=days)
    pdf_bytes = ReportService.generate_pdf(data)
    filename = f"fitpulse_{data.get('report_type')}_report.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
