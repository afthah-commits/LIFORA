# LIFORA — Complete Production Deployment Guide (Render)

**Tagline:** *Your Life. Your Space. Your Rules.*

This guide provides the complete walkthrough for deploying **LIFORA** to Render as a resilient, secure, and mobile-friendly production system.

---

## 1. System Architecture on Render

The production deployment consists of three services defined in [`render.yaml`](file:///c:/personal_projects/FITPULSE-AI/render.yaml):

| Service | Type | Plan / Region | Build / Start Command | Public Access |
| :--- | :--- | :--- | :--- | :--- |
| **LIFORA Frontend** | Static Site | Free / Global CDN | `npm install && npm run build`<br>Publish: `dist` | `https://lifora-frontend.onrender.com` |
| **LIFORA Backend** | Web Service (Python) | Free or Starter / Singapore | `pip install -r backend/requirements.txt`<br>`uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT` | `https://lifora-backend.onrender.com` |
| **LIFORA Database** | Managed PostgreSQL | Free or Starter / Singapore | Auto-provisioned PostgreSQL 16+ | Internal Render Network (IP Allowlist default empty) |

---

## 2. Prerequisites & GitHub Setup

1. **Create a Private GitHub Repository:**
   - Go to [GitHub](https://github.com/new) and create a new repository named `lifora` (or `FITPULSE-AI`).
2. **Push Local Commits to GitHub:**
   Run the following commands in your local project root:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/lifora.git
   git branch -M main
   git push -u origin main
   ```

---

## 3. Deploying via Render Blueprint (`render.yaml`)

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub repository (`lifora`).
4. Render will read [`render.yaml`](file:///c:/personal_projects/FITPULSE-AI/render.yaml) and present the 3 services:
   - `lifora-db` (PostgreSQL)
   - `lifora-backend` (Web Service)
   - `lifora-frontend` (Static Site)
5. Click **Apply**.
6. Render will automatically:
   - Provision the PostgreSQL database.
   - Inject the internal `DATABASE_URL` into the backend web service.
   - Generate a secure cryptographic `SECRET_KEY` for JWT tokens.
   - Run Alembic migrations via `preDeployCommand: python -m alembic upgrade head`.
   - Build and bundle the React + Vite frontend SPA with rewrite rules.

---

## 4. Database Data Migration (Local `fitpulse_db` $\rightarrow$ Render PostgreSQL)

Your local database `fitpulse_db` has been backed up to:
- [`backups/fitpulse_db_backup_20261031_211159.sql`](file:///c:/personal_projects/FITPULSE-AI/backups) (Full schema + records)
- [`backups/fitpulse_db_backup_20261031_211159.dump`](file:///c:/personal_projects/FITPULSE-AI/backups) (Custom binary archive)
- [`backups/fitpulse_db_data_only.sql`](file:///c:/personal_projects/FITPULSE-AI/backups) (Clean data inserts)

### Step-by-Step Data Migration Procedure:

1. In Render Dashboard, go to **`lifora-db`** $\rightarrow$ **Connections**.
2. Temporarily add your local IP to **IP Allow List** (or add `0.0.0.0/0` temporarily during migration, then delete it).
3. Copy the **External Database URL** (e.g. `postgresql://lifora_user:password@dpg-xxxx.singapore-postgres.render.com/lifora_db`).
4. Run the automated migration script locally:
   ```bash
   python scripts/migrate_to_render.py --render-url "postgresql://lifora_user:password@dpg-xxxx.singapore-postgres.render.com/lifora_db"
   ```
5. The script will:
   - Connect to local `fitpulse_db` in **strictly READ-ONLY** mode.
   - Validate the remote Alembic revision (`27e0a5ca90ff`).
   - Transfer all records in foreign-key dependency order with replica trigger bypass.
   - Run post-migration validation queries comparing all 38 tables and row counts.
6. Once verified, remove your external IP from Render's IP Allow List to keep your database strictly private to internal services.

---

## 5. Environment Variables Reference

### Backend (`lifora-backend`):

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enables production security mode |
| `APP_ENV` | `production` | Alias for environment identification |
| `DATABASE_URL` | Derived from `lifora-db` | Internal Render connection string |
| `SECRET_KEY` | Auto-generated 64-char string | Used for signing HMAC-SHA256 JWT tokens |
| `FRONTEND_URL` | `https://lifora-frontend.onrender.com` | Base URL of deployed static site |
| `CORS_ORIGINS` | `["https://lifora-frontend.onrender.com"]` | Whitelisted origins |
| `ENABLE_DOCS` | `false` | Disables `/api/v1/docs` in production |
| `SMTP_HOST` | e.g. `smtp.sendgrid.net` / `smtp.resend.com` | SMTP host for email verification |
| `SMTP_PORT` | `587` | SMTP TLS port |
| `SMTP_USER` | `apikey` or username | SMTP authentication username |
| `SMTP_PASSWORD` | `<YOUR_API_KEY>` | SMTP password or API token |
| `SMTP_FROM_EMAIL` | `noreply@yourdomain.com` | Sender address |
| `AI_PROVIDER` | `openai` (Optional) | AI assistant provider |
| `AI_API_KEY` | `sk-...` (Optional) | AI provider API key |

### Frontend (`lifora-frontend`):

| Variable | Production Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://lifora-backend.onrender.com` | Production API endpoint |

---

## 6. Post-Deployment Verification

Run the verification suite against your live Render URLs:

```bash
python scripts/verify_production.py --frontend https://lifora-frontend.onrender.com --backend https://lifora-backend.onrender.com
```

Checks performed:
- Backend `/health` probe (HTTP 200).
- Unauthenticated access prevention on `/api/v1/auth/me` (HTTP 401).
- CORS preflight headers on API endpoints.
- Swagger documentation lockdown in production.
- Frontend root index loading and title verification.
- SPA rewrite routing on deep links (`/water`, `/customization`).
- PWA Web Manifest validation (`/manifest.webmanifest`).
- Service Worker registration (`/sw.js`).
- PWA logo and icon availability.

---

## 7. Estimated Ongoing Render Service Costs

| Service | Plan | Monthly Cost | Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Static Site** | Free | **\$0.00** | Includes global CDN, custom domains, and automated HTTPS. |
| **Backend Web Service** | Free or Starter | **\$0.00** (Free)<br>or **\$7.00** (Starter) | Free tier spins down after 15 min of inactivity. Starter tier provides 512MB RAM, always-on zero spindown, and faster CPU. |
| **Managed PostgreSQL** | Free or Starter | **\$0.00** (Free 30-day)<br>or **\$7.00** (Starter) | Free database is valid for 30 days. Starter provides permanent storage, automated daily backups, and 1GB RAM. |
| **Total Estimated Cost** | — | **\$0.00 / mo** (Free Tier)<br>or **\$14.00 / mo** (Production Tier) | Highly cost-effective personal life OS stack. |
