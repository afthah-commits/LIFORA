import pytest
import httpx
from datetime import date


@pytest.mark.asyncio
async def test_screentime_flow(client: httpx.AsyncClient, auth_headers: dict):
    # 1. Update goal
    goal_res = await client.put(
        "/api/v1/screen-time/goal",
        json={"daily_target_minutes": 180},
        headers=auth_headers,
    )
    assert goal_res.status_code == 200
    assert goal_res.json()["daily_target_minutes"] == 180

    # 2. Add manual session
    today_str = date.today().isoformat()
    session_res = await client.post(
        "/api/v1/screen-time/sessions",
        json={
            "app_name": "Instagram",
            "package_name": "com.instagram.android",
            "category": "Social Media",
            "date": today_str,
            "duration_minutes": 45,
            "source": "manual",
        },
        headers=auth_headers,
    )
    assert session_res.status_code == 201
    assert session_res.json()["app_name"] == "Instagram"

    # 3. Get daily summary
    summary_res = await client.get(
        f"/api/v1/screen-time/daily?date_str={today_str}",
        headers=auth_headers,
    )
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_duration_minutes"] == 45
    assert summary["remaining_allowed_minutes"] == 135
    assert len(summary["sessions"]) == 1

    # 4. Edit manual session
    sess_id = session_res.json()["id"]
    edit_res = await client.put(
        f"/api/v1/screen-time/sessions/{sess_id}",
        json={
            "duration_minutes": 60,
            "notes": "Updated duration from manual edit",
        },
        headers=auth_headers,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["duration_minutes"] == 60

    # 5. Companion Sync
    sync_res = await client.post(
        "/api/v1/screen-time/sync",
        json={
            "device_id": "Pixel-8-Pro",
            "items": [
                {
                    "app_name": "YouTube",
                    "package_name": "com.google.android.youtube",
                    "category": "Entertainment",
                    "date": today_str,
                    "duration_minutes": 30,
                }
            ],
        },
        headers=auth_headers,
    )
    assert sync_res.status_code == 200
    assert sync_res.json()["synced_count"] == 1


@pytest.mark.asyncio
async def test_screentime_screenshot_import_flow(client: httpx.AsyncClient, auth_headers: dict):
    import io
    from PIL import Image, ImageDraw

    # Generate synthetic screenshot
    img = Image.new("RGB", (600, 800), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "Screen time", fill=(0, 0, 0))
    draw.text((50, 100), "Instagram 1 hr 15 min", fill=(0, 0, 0))
    draw.text((50, 150), "WhatsApp 35 min", fill=(0, 0, 0))

    img_bytes_io = io.BytesIO()
    img.save(img_bytes_io, format="JPEG")
    img_bytes = img_bytes_io.getvalue()

    # 1. Upload screenshot
    files = {"file": ("digital_wellbeing.jpg", img_bytes, "image/jpeg")}
    upload_res = await client.post(
        "/api/v1/screen-time/upload-screenshot",
        files=files,
        headers=auth_headers,
    )
    assert upload_res.status_code == 200
    review_data = upload_res.json()
    import_id = review_data["id"]
    assert review_data["status"] == "pending_review"

    # 2. Confirm extracted items (allows user correction before saving)
    confirm_res = await client.post(
        f"/api/v1/screen-time/imports/{import_id}/confirm",
        json={
            "target_date": date.today().isoformat(),
            "items": [
                {
                    "app_name": "Instagram",
                    "category": "Social Media",
                    "duration_minutes": 75,
                    "notes": "Imported from screenshot",
                },
                {
                    "app_name": "WhatsApp",
                    "category": "Communication",
                    "duration_minutes": 35,
                    "notes": "Imported from screenshot",
                },
            ],
        },
        headers=auth_headers,
    )
    assert confirm_res.status_code == 200
    confirmed = confirm_res.json()
    assert confirmed["status"] == "confirmed"
    assert confirmed["total_detected_minutes"] == 110

    # 3. Prevent duplicate screenshot import
    dup_files = {"file": ("digital_wellbeing.jpg", img_bytes, "image/jpeg")}
    dup_res = await client.post(
        "/api/v1/screen-time/upload-screenshot",
        files=dup_files,
        headers=auth_headers,
    )
    assert dup_res.status_code == 400
    assert "already imported" in dup_res.json()["detail"]

    # 4. Check import history
    hist_res = await client.get("/api/v1/screen-time/imports", headers=auth_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 1
    assert history[0]["id"] == import_id
    assert history[0]["status"] == "confirmed"


@pytest.mark.asyncio
async def test_finance_flow(client: httpx.AsyncClient, auth_headers: dict):
    today_str = date.today().isoformat()

    # 1. Get categories (auto-seeds defaults)
    cat_res = await client.get("/api/v1/finance/categories", headers=auth_headers)
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) > 0

    # 2. Add salary record
    salary_res = await client.post(
        "/api/v1/finance/salaries",
        json={
            "salary_date": today_str,
            "employer": "Tech Corp",
            "basic_salary": 75000.0,
            "allowances": 15000.0,
            "deductions": 5000.0,
            "net_salary": 85000.0,
        },
        headers=auth_headers,
    )
    assert salary_res.status_code == 201
    assert float(salary_res.json()["net_salary"]) == 85000.0

    # 3. Add expense entry
    expense_res = await client.post(
        "/api/v1/finance/expenses",
        json={
            "amount": 2500.0,
            "category": "Food",
            "date": today_str,
            "title": "Grocery Shopping",
            "payment_method": "UPI",
        },
        headers=auth_headers,
    )
    assert expense_res.status_code == 201
    assert float(expense_res.json()["amount"]) == 2500.0

    # 4. Get finance overview
    overview_res = await client.get("/api/v1/finance/overview", headers=auth_headers)
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert float(overview["total_expenses"]) == 2500.0


@pytest.mark.asyncio
async def test_custom_module_builder_flow(client: httpx.AsyncClient, auth_headers: dict):
    # 1. Create custom module
    mod_res = await client.post(
        "/api/v1/custom-modules",
        json={
            "name": "Book Reading Tracker",
            "description": "Track books, reading status, and ratings",
            "icon": "BookOpen",
            "color": "#3b82f6",
            "show_in_sidebar": True,
            "show_in_dashboard": True,
        },
        headers=auth_headers,
    )
    assert mod_res.status_code == 201
    module_data = mod_res.json()
    module_id = module_data["id"]
    assert module_data["slug"] == "book-reading-tracker"

    # 2. Add fields to module
    # Text field: Title
    f1_res = await client.post(
        f"/api/v1/custom-modules/{module_id}/fields",
        json={
            "field_label": "Book Title",
            "field_type": "text",
            "is_required": True,
            "display_order": 1,
        },
        headers=auth_headers,
    )
    assert f1_res.status_code == 201

    # Number field: Pages Read
    f2_res = await client.post(
        f"/api/v1/custom-modules/{module_id}/fields",
        json={
            "field_label": "Pages Read",
            "field_type": "number",
            "is_required": False,
            "display_order": 2,
        },
        headers=auth_headers,
    )
    assert f2_res.status_code == 201

    # 3. Create a record in this module
    rec_res = await client.post(
        f"/api/v1/custom-modules/{module_id}/records",
        json={
            "data": {
                "book_title": "Atomic Habits",
                "pages_read": 320,
            }
        },
        headers=auth_headers,
    )
    assert rec_res.status_code == 201
    assert rec_res.json()["data"]["book_title"] == "Atomic Habits"

    # 4. Query paginated records
    records_res = await client.get(
        f"/api/v1/custom-modules/{module_id}/records?search=Atomic",
        headers=auth_headers,
    )
    assert records_res.status_code == 200
    assert records_res.json()["total"] == 1


@pytest.mark.asyncio
async def test_dashboard_overview_flow(client: httpx.AsyncClient, auth_headers: dict):
    # Get dashboard overview
    dash_res = await client.get("/api/v1/dashboard/overview", headers=auth_headers)
    assert dash_res.status_code == 200
    data = dash_res.json()

    # Verify 4 primary rectangular cards exist
    card_ids = [c["id"] for c in data["primary_cards"]]
    assert "fitness" in card_ids
    assert "screentime" in card_ids
    assert "money" in card_ids
    assert "planner" in card_ids

    # Verify quick actions
    assert len(data["quick_actions"]) >= 6

    # Update dashboard config
    cfg_res = await client.put(
        "/api/v1/dashboard/config",
        json={
            "layout_config": {
                "visible_cards": ["fitness", "screentime", "money", "planner"],
                "card_order": ["money", "fitness", "screentime", "planner"],
            }
        },
        headers=auth_headers,
    )
    assert cfg_res.status_code == 200
    assert cfg_res.json()["layout_config"]["card_order"][0] == "money"
