# LIFORA — Personal Life Operating System

> **Tagline:** Your Life. Your Space. Your Rules.

**LIFORA** is a unified personal life operating system where you can manage your entire daily life through customizable modules, visual dashboard editors, dynamic navigation, workflows, and personal analytics.

Pairs a high-performance **FastAPI** backend with a modern dark emerald-themed **React + TypeScript + Vite** PWA frontend, backed by a persistent **PostgreSQL** database.

---

## 🌟 Core Product Principles

1. **Extremely Simple for Everyday Users**: Out-of-the-box minimal experience with 4 essential cards, a clean progress checklist, and quick 1-tap logging.
2. **Fully Customizable When You Need Control**: A dedicated Customization Center to edit dashboard cards, navigation menus, widget visibility, and build custom tracking modules with 15 field types.
3. **Mobile-First & Progressive Web App (PWA)**: 5-tab mobile navigation, touch-optimized targets ($\ge 44\text{px}$), and offline PWA installation on iOS and Android.
4. **Configuration-Driven Architecture**: "Create Once $\rightarrow$ Use Anywhere $\rightarrow$ Customize Everywhere". Placements in Dashboard, Sidebar, Mobile Bottom Nav, More Menu, and Quick Actions.
5. **Secure Multi-User System**: Argon2id password hashing, JWT token rotation, email verification workflow, and strict per-user data isolation.
6. **Zero Data Loss**: Robust backup and restore engine with full JSON personal data exports and validated schema imports.

---

## 📦 What's Inside LIFORA

### 1. Minimal Home Dashboard
- **Welcoming Time-of-Day Greeting**: "Good Morning / Afternoon / Evening", displaying user's display name.
- **Today's Core Pillars**:
  - **Fitness & Health**: Daily calories & protein target progress.
  - **Water Tracker**: Consumed hydration vs. daily goal (e.g. 2500 ml).
  - **Money & Salary**: Monthly spend vs. budget and income overview in INR (₹).
  - **Daily Planner**: Active scheduled tasks and focus items.
- **Today's Progress Checklist**: Visual milestones for hydration, nutrition, and daily priorities.
- **Universal Quick Add**: Global 1-tap logging for Water, Food, Expense, Income, Workout, Weight, Tasks, and user-created custom modules.

### 2. Universal Customization Center (`/customization`)
Accessible with one tap from **More** and **Settings**:
- **Dashboard Editor**: Add, remove, hide, show, resize, and reorder dashboard cards with live preview.
- **Sidebar & Nav Editor**: Configure primary sidebar groups, bottom navigation tabs, custom links, and icons.
- **Module Builder**: Create unlimited custom modules with 15 dynamic field types (Text, Number, Select, Multi-select, Date, Time, Checkbox, Slider, Rating, Currency, URL, Image, Textarea, Color, Toggle).
- **Module Template Library**: 10 built-in templates ready with 1-click activation:
  1. *Book Tracker*
  2. *Habit Tracker*
  3. *Vehicle Maintenance*
  4. *Subscription Tracker*
  5. *Learning Tracker*
  6. *Travel Planner*
  7. *Shopping List*
  8. *Personal Goals*
  9. *Medicine Schedule*
  10. *Project Tracker*
- **Page & Widget Editor**: Toggle greeting, checklist, quick add button, and card layout density.
- **Feature Manager**: Safely enable or disable core features without deleting underlying database records.
- **Theme & Appearance**: OLED Black (`#021816`), Emerald accents (`#10b981`), and UI density controls.

### 3. Global Universal Search (`Ctrl+K`)
- Accessible from anywhere in the app via `Ctrl+K` (or `Cmd+K` on macOS) or the search icon in the header.
- Instant search across navigation pages, custom modules, dynamic records, and planner items.
- Full keyboard navigation (`↑`, `↓`, `Enter`, `ESC`) with category filter pills.

### 4. Full Personal Data Backup & Restore
- **Export Backup**: Single-click export of complete personal records to JSON (`/api/v1/backup/export`).
- **Validated Import**: Inspects backup files, verifies schema, and displays a count summary of records before committing changes.
- **Restore Modes**:
  - *Merge*: Safely merges imported data with existing records without data loss.
  - *Overwrite*: Cleanly replaces personal records with the backup file.
- **Multi-User Isolation**: Export and restore operations are strictly scoped to the authenticated user ID.

### 5. Multi-User Authentication & Security
- **Registration**: Email and password with Argon2id hashing and password confirmation.
- **Email Verification**: User registration generates a verification token. In local development, the token is surfaced directly in the UI and response for 1-click bypass.
- **Login**: Email + password, show/hide password toggle, Remember Me, and Forgot Password recovery flow.
- **JWT Token Rotation**: Short-lived access tokens with secure refresh token rotation and token-reuse revocation.

---

## ⚡ Quick Start for Windows

### 1. Launch with One Click
Double-click `start-lifora.bat` or run:
```bat
start-lifora.bat
```
This launcher automatically:
1. Verifies Python 3.11+ and Node.js 18+.
2. Confirms PostgreSQL is listening on port 5432 (starts Docker container or local service).
3. Applies Alembic migrations (`python -m alembic upgrade head`).
4. Launches the FastAPI backend server on `http://localhost:8000`.
5. Launches the Vite React frontend on `http://localhost:5173`.

### 2. Stop All Services Cleanly
Double-click `stop-lifora.bat` or run:
```bat
stop-lifora.bat
```

---

## 🌐 Localhost URLs & Endpoints

| Service / View | URL | Purpose |
| :--- | :--- | :--- |
| **LIFORA Web App** | `http://localhost:5173` | Main personal life management app |
| **Customization Center** | `http://localhost:5173/customization` | Visual app & module builder |
| **Backend Health** | `http://localhost:8000/health` | FastAPI health status check |
| **API Documentation** | `http://localhost:8000/api/v1/docs` | Interactive Swagger API docs |
| **Alternative Docs** | `http://localhost:8000/api/v1/redoc` | ReDoc API specification |

### Default Credentials (Seed Account)
- **Email:** `user@fitpulse.ai`
- **Password:** `fitpulse123`
*(Or click "Create Account" on the login screen to register a new personal account).*

---

## 🧪 Testing & Verification Suite

### Backend Pytest Suite
```powershell
python -m pytest backend/tests
```
- **18 passed** across activities, analytics, auth, nutrition, modules, water, weight, planner, workouts.

### Frontend Vitest Suite
```powershell
cd frontend
npx vitest run
```
- **34 passed (6 test files)** across store, common components, PWA, V2 features, water tracker, customization center.

### TypeScript Typecheck & Production Build
```powershell
cd frontend
npx tsc -b
npm run build
```
- **0 errors**, production PWA assets output to `frontend/dist/`.
