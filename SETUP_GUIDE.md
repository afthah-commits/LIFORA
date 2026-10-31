# LIFORA — Local Development & Setup Guide (Windows)

> **Tagline:** Your Life. Your Space. Your Rules.

This guide covers everything required to run, develop, test, and troubleshoot **LIFORA** locally on your Windows machine, as well as accessing the PWA on an Android or iOS device over your local Wi-Fi network.

---

## ⚡ Quick Start (1-Click Run)

To start the entire application (PostgreSQL verification + Alembic migrations + FastAPI backend + React Vite frontend):

1. **Double-click** `start-lifora.bat` in the project root.
2. Two dedicated command windows will launch:
   - **LIFORA Backend** on `http://localhost:8000`
   - **LIFORA Frontend** on `http://localhost:5173`
3. Open your browser at **[http://localhost:5173](http://localhost:5173)**.
4. Log in or create an account:
   - **Create Account**: Register with any email and password (with local 1-click dev email verification).
   - **Seed Account**:
     - **Email:** `user@fitpulse.ai`
     - **Password:** `fitpulse123`

To cleanly terminate all services, double-click **`stop-lifora.bat`**.

---

## 🛠️ Prerequisites & Verification

| Tool | Recommended Version | Verification Command |
| :--- | :--- | :--- |
| **Python** | 3.11+ (Tested on 3.13.5) | `python --version` |
| **Node.js** | 18+ (Tested on v24.11.0) | `node -v` |
| **npm** | 9+ (Tested on 11.6.1) | `npm -v` |
| **PostgreSQL** | 14+ (Port 5432) | `netstat -ano \| findstr :5432` |

---

## 🗄️ Database & Alembic Migrations

LIFORA connects to the PostgreSQL database `fitpulse_db` on port `5432`.

### Migration Commands
To apply all pending database migrations safely without losing data:
```cmd
python -m alembic upgrade head
```

### Checking Migration History
```cmd
python -m alembic current
```
*Current revision: `27e0a5ca90ff (head) - add_lifora_auth_and_profile_fields`.*

---

## 🌐 Localhost URLs & Endpoints

| Service / View | URL | Purpose |
| :--- | :--- | :--- |
| **LIFORA Web App** | `http://localhost:5173` | Main dashboard & personal management |
| **Customization Center** | `http://localhost:5173/customization` | Layout, navigation & module editor |
| **Backend Health** | `http://localhost:8000/health` | FastAPI health check |
| **API Documentation** | `http://localhost:8000/api/v1/docs` | Swagger interactive API documentation |
| **API ReDoc** | `http://localhost:8000/api/v1/redoc` | OpenAPI spec documentation |

---

## 📱 Mobile Testing Over Local Wi-Fi (LAN)

1. Find your laptop's local IP address on Wi-Fi:
   ```cmd
   ipconfig
   ```
   *(e.g., `192.168.31.161`)*
2. Ensure your phone is connected to the same Wi-Fi network.
3. On your phone's browser (Chrome or Safari), visit:
   ```
   http://<YOUR_LAPTOP_IP>:5173
   ```
4. To install as a PWA:
   - **Chrome on Android**: Tap the three dots $\rightarrow$ "Install app" or "Add to Home screen".
   - **Safari on iOS**: Tap Share $\rightarrow$ "Add to Home Screen".

---

## 🧪 Running Automated Tests

### Backend Unit Tests
```cmd
python -m pytest backend/tests
```
*Result: 18 passed.*

### Frontend Vitest Suite
```cmd
cd frontend
npx vitest run
```
*Result: 34 passed across 6 test files.*

### TypeScript Check & Production Build
```cmd
cd frontend
npx tsc -b
npm run build
```
*Result: 0 errors, production build generated in `dist/`.*
