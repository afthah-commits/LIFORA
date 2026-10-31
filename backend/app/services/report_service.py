import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.report import WeeklyReport
from backend.app.models.user import UserProfile
from backend.app.services.analytics_service import AnalyticsService


class ReportService:
    @staticmethod
    async def generate_report_data(session: AsyncSession, user_id: uuid.UUID, days: int = 7) -> dict[str, Any]:
        analytics = await AnalyticsService.get_overview(session, user_id, days=days)

        # Get profile
        p_q = select(UserProfile).where(UserProfile.user_id == user_id)
        p_res = await session.execute(p_q)
        profile = p_res.scalar_one_or_none()

        user_info = {
            "age": profile.age if profile else 19,
            "height_cm": profile.height_cm if profile else 167.0,
            "current_weight_kg": profile.current_weight_kg if profile else 53.0,
            "timezone": profile.timezone if profile else "Asia/Kolkata",
        }

        report_type = "weekly" if days <= 7 else "monthly"

        # Structured data for analytics and AI
        report_data = {
            "report_type": report_type,
            "start_date": str(analytics.start_date),
            "end_date": str(analytics.end_date),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "user_info": user_info,
            "nutrition_summary": {
                "recorded_days": analytics.nutrition_days_recorded,
                "total_days": analytics.total_days_in_period,
                "average_calories": analytics.average_calories,
                "average_protein_g": analytics.average_protein_g,
                "average_carbs_g": analytics.average_carbs_g,
                "average_fat_g": analytics.average_fat_g,
                "protein_target_g": analytics.protein_target_g,
                "protein_goal_met_days": analytics.protein_goal_met_days,
                "protein_goal_completion_rate": analytics.protein_goal_completion_rate,
            },
            "workout_summary": {
                "total_sessions": analytics.total_workout_sessions,
                "total_duration_minutes": analytics.total_workout_duration_min,
            },
            "running_summary": {
                "total_distance_km": analytics.total_running_distance_km,
                "total_sessions": analytics.total_running_sessions,
                "average_pace": analytics.average_running_pace or "N/A",
            },
            "football_summary": {
                "total_sessions": analytics.total_football_sessions,
                "total_duration_minutes": analytics.total_football_duration_min,
            },
            "weight_summary": {
                "recorded_days": analytics.weight_days_recorded,
                "start_weight_kg": analytics.start_weight_kg,
                "latest_weight_kg": analytics.latest_weight_kg,
                "weight_change_kg": analytics.weight_change_kg,
                "target_weight_kg": analytics.target_weight_kg,
            },
            "data_completeness": {
                "nutrition_logging_rate": round((analytics.nutrition_days_recorded / analytics.total_days_in_period) * 100, 1),
                "weight_logging_rate": round((analytics.weight_days_recorded / analytics.total_days_in_period) * 100, 1),
            },
            "goal_completion": {
                "protein_target_g": analytics.protein_target_g,
                "protein_met_days": analytics.protein_goal_met_days,
                "protein_rate_percent": analytics.protein_goal_completion_rate,
            },
            "water_summary": {
                "total_consumed_ml": analytics.water_total_consumed_ml or 0,
                "daily_average_ml": analytics.water_daily_average_ml or 0,
                "target_ml": analytics.water_target_ml or 2500,
                "goal_met_days": analytics.water_goal_met_days or 0,
            }
        }

        # Save record in weekly_reports table
        db_report = WeeklyReport(
            user_id=user_id,
            start_date=analytics.start_date,
            end_date=analytics.end_date,
            report_type=report_type,
            report_data=report_data
        )
        session.add(db_report)
        await session.flush()

        return report_data

    @staticmethod
    def generate_csv(report_data: dict[str, Any]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["FITPULSE AI - Fitness Performance Report"])
        writer.writerow(["Report Type", report_data.get("report_type")])
        writer.writerow(["Period", f"{report_data.get('start_date')} to {report_data.get('end_date')}"])
        writer.writerow(["Generated At", report_data.get("generated_at")])
        writer.writerow([])

        writer.writerow(["--- NUTRITION SUMMARY ---"])
        nutr = report_data.get("nutrition_summary", {})
        writer.writerow(["Days Recorded", nutr.get("recorded_days"), f"out of {nutr.get('total_days')}"])
        writer.writerow(["Average Calories", nutr.get("average_calories", "N/A")])
        writer.writerow(["Average Protein (g)", nutr.get("average_protein_g", "N/A")])
        writer.writerow(["Average Carbs (g)", nutr.get("average_carbs_g", "N/A")])
        writer.writerow(["Average Fat (g)", nutr.get("average_fat_g", "N/A")])
        writer.writerow(["Daily Protein Target (g)", nutr.get("protein_target_g")])
        writer.writerow(["Protein Goal Met Days", nutr.get("protein_goal_met_days")])
        writer.writerow(["Goal Completion Rate (%)", nutr.get("protein_goal_completion_rate")])
        writer.writerow([])

        writer.writerow(["--- ACTIVITIES & WORKOUTS ---"])
        wo = report_data.get("workout_summary", {})
        rn = report_data.get("running_summary", {})
        fb = report_data.get("football_summary", {})
        writer.writerow(["Strength Workout Sessions", wo.get("total_sessions")])
        writer.writerow(["Workout Total Duration (min)", wo.get("total_duration_minutes")])
        writer.writerow(["Running Total Distance (km)", rn.get("total_distance_km")])
        writer.writerow(["Running Sessions", rn.get("total_sessions")])
        writer.writerow(["Running Average Pace", rn.get("average_pace")])
        writer.writerow(["Football Sessions", fb.get("total_sessions")])
        writer.writerow(["Football Total Duration (min)", fb.get("total_duration_minutes")])
        writer.writerow([])

        writer.writerow(["--- BODY WEIGHT PROGRESSION ---"])
        wt = report_data.get("weight_summary", {})
        writer.writerow(["Starting Weight (kg)", wt.get("start_weight_kg", "N/A")])
        writer.writerow(["Latest Weight (kg)", wt.get("latest_weight_kg", "N/A")])
        writer.writerow(["Net Weight Change (kg)", wt.get("weight_change_kg", "N/A")])
        writer.writerow(["Target Weight (kg)", wt.get("target_weight_kg")])

        return output.getvalue()

    @staticmethod
    def generate_pdf(report_data: dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#10b981'), # Emerald
            alignment=0,
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#6b7280'),
            spaceAfter=14
        )
        heading_style = ParagraphStyle(
            'ReportHeading',
            parent=styles['Heading2'],
            fontSize=13,
            leading=17,
            textColor=colors.HexColor('#111827'),
            spaceBefore=12,
            spaceAfter=6
        )
        cell_style = ParagraphStyle(
            'CellText',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1f2937')
        )
        bold_cell_style = ParagraphStyle(
            'BoldCellText',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#111827')
        )

        elements = []

        # Title
        r_type = report_data.get("report_type", "Weekly").capitalize()
        elements.append(Paragraph(f"FITPULSE AI — {r_type} Fitness Intelligence Report", title_style))
        elements.append(Paragraph(
            f"Period: <b>{report_data.get('start_date')}</b> to <b>{report_data.get('end_date')}</b> &nbsp;|&nbsp; Generated on: {report_data.get('generated_at')[:10]}",
            subtitle_style
        ))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb'), spaceAfter=15))

        # 1. Nutrition Table
        elements.append(Paragraph("1. Nutrition & Protein Performance", heading_style))
        nutr = report_data.get("nutrition_summary", {})
        nutr_table_data = [
            [Paragraph("Metric", bold_cell_style), Paragraph("Value", bold_cell_style), Paragraph("Target / Benchmark", bold_cell_style)],
            [Paragraph("Days Logged", cell_style), Paragraph(f"{nutr.get('recorded_days', 0)} / {nutr.get('total_days', 7)} days", cell_style), Paragraph("Daily Tracking", cell_style)],
            [Paragraph("Average Calories", cell_style), Paragraph(f"{nutr.get('average_calories') or 'No entries'} kcal", cell_style), Paragraph("User Defined Target", cell_style)],
            [Paragraph("Average Protein", cell_style), Paragraph(f"{nutr.get('average_protein_g') or 'No entries'} g", cell_style), Paragraph(f"{nutr.get('protein_target_g', 85)} g target", cell_style)],
            [Paragraph("Average Carbs", cell_style), Paragraph(f"{nutr.get('average_carbs_g') or 'No entries'} g", cell_style), Paragraph("Macro Balance", cell_style)],
            [Paragraph("Average Fat", cell_style), Paragraph(f"{nutr.get('average_fat_g') or 'No entries'} g", cell_style), Paragraph("Essential Fats", cell_style)],
            [Paragraph("Protein Target Hit Days", cell_style), Paragraph(f"{nutr.get('protein_goal_met_days', 0)} days", cell_style), Paragraph(f"{nutr.get('protein_goal_completion_rate', 0)}% consistency", cell_style)],
        ]
        t1 = Table(nutr_table_data, colWidths=[180, 160, 200])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t1)
        elements.append(Spacer(1, 10))

        # 2. Activity Table
        elements.append(Paragraph("2. Physical Activity & Training", heading_style))
        wo = report_data.get("workout_summary", {})
        rn = report_data.get("running_summary", {})
        fb = report_data.get("football_summary", {})
        act_table_data = [
            [Paragraph("Activity Domain", bold_cell_style), Paragraph("Volume / Quantity", bold_cell_style), Paragraph("Performance Notes", bold_cell_style)],
            [Paragraph("Strength Workouts", cell_style), Paragraph(f"{wo.get('total_sessions', 0)} sessions", cell_style), Paragraph(f"{wo.get('total_duration_minutes', 0)} total minutes", cell_style)],
            [Paragraph("Running", cell_style), Paragraph(f"{rn.get('total_distance_km', 0.0)} km ({rn.get('total_sessions', 0)} runs)", cell_style), Paragraph(f"Average Pace: {rn.get('average_pace', 'N/A')}", cell_style)],
            [Paragraph("Football", cell_style), Paragraph(f"{fb.get('total_sessions', 0)} sessions", cell_style), Paragraph(f"{fb.get('total_duration_minutes', 0)} match/training minutes", cell_style)],
        ]
        t2 = Table(act_table_data, colWidths=[180, 160, 200])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t2)
        elements.append(Spacer(1, 10))

        # 3. Weight & Body Composition
        elements.append(Paragraph("3. Weight Progression & Goal Milestones", heading_style))
        wt = report_data.get("weight_summary", {})
        diff = wt.get("weight_change_kg")
        diff_str = f"{diff:+.1f} kg" if diff is not None else "N/A"
        wt_table_data = [
            [Paragraph("Parameter", bold_cell_style), Paragraph("Status", bold_cell_style), Paragraph("Target Reference", bold_cell_style)],
            [Paragraph("Starting Weight", cell_style), Paragraph(f"{wt.get('start_weight_kg') or 'N/A'} kg", cell_style), Paragraph("Initial baseline", cell_style)],
            [Paragraph("Latest Logged Weight", cell_style), Paragraph(f"{wt.get('latest_weight_kg') or 'N/A'} kg", cell_style), Paragraph(f"Goal: {wt.get('target_weight_kg', 60.0)} kg", cell_style)],
            [Paragraph("Net Period Change", cell_style), Paragraph(diff_str, cell_style), Paragraph("Controlled trajectory", cell_style)],
        ]
        t3 = Table(wt_table_data, colWidths=[180, 160, 200])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(t3)
        elements.append(Spacer(1, 15))

        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb'), spaceAfter=8))
        elements.append(Paragraph(
            "FITPULSE AI — Confidential Personal Fitness Report. Calculated directly from authorized verified database logs.",
            ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#9ca3af'), alignment=1)
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
