# DataFlow AI

**Turn Your Data Into Decisions.**

An AI-powered Business Intelligence platform that automatically generates interactive dashboards from uploaded data files. Upload any supported file and get a complete, professional dashboard in seconds.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (installed at `C:\Users\Admin\AppData\Local\Programs\nodejs`)
- Python 3.11+ with uv (`C:\Users\Admin\.local\bin\uv.exe`)
- SQLite (for development) or PostgreSQL (for production)

### Setup (First Time)

```
# Run the setup script
setup.bat
```

Or manually:

```bash
# Backend
cd backend
uv venv --python 3.11 .venv
uv pip install -r requirements.txt --python .venv
cp .env.example .env
# Edit .env with your settings

# Frontend
cd frontend
npm install
```

### Start the Application

**Terminal 1 — Backend:**
```bash
cd backend
.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173
```

**Open:** http://localhost:5173  
**API Docs:** http://localhost:8000/api/docs

---

## 📁 Project Structure

```
dashboard/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/                # REST API routes
│   │   │   ├── auth.py         # Authentication endpoints
│   │   │   ├── datasets.py     # Dataset upload & management
│   │   │   ├── dashboards.py   # Dashboard CRUD
│   │   │   └── analytics.py    # AI chat, insights, chart data
│   │   ├── core/
│   │   │   ├── config.py       # App configuration (env vars)
│   │   │   ├── database.py     # SQLAlchemy setup
│   │   │   └── security.py     # JWT auth, password hashing
│   │   ├── models/
│   │   │   ├── user.py         # User model
│   │   │   └── dataset.py      # Dataset & Dashboard models
│   │   └── services/
│   │       ├── file_parser.py  # Universal file parser
│   │       ├── data_analyzer.py # Statistical analysis engine
│   │       ├── ai_service.py   # AI chat (OpenAI + rule-based)
│   │       └── export_service.py # PDF/Excel/CSV export
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt
│   └── .env                    # Configuration (create from .env.example)
│
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── pages/              # Application pages
│   │   ├── components/
│   │   │   ├── charts/         # ChartRenderer (Recharts)
│   │   │   ├── dashboard/      # DashboardView, InsightCard
│   │   │   ├── layout/         # Sidebar, AppLayout
│   │   │   └── ui/             # KPICard, LoadingSpinner, EmptyState
│   │   ├── store/              # Zustand state management
│   │   ├── lib/                # API client, utilities
│   │   └── types/              # TypeScript type definitions
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── setup.bat                   # First-time setup
├── start-backend.bat           # Start backend server
├── start-frontend.bat          # Start frontend dev server
└── README.md
```

---

## ✨ Features

### Data Upload
- **Supported formats:** CSV, Excel (.xlsx/.xls), JSON, XML, HTML tables, TXT, Parquet, SQL exports, ZIP
- Drag-and-drop upload with progress indicator
- Multiple file uploads
- Excel sheet selection
- File validation (type, size up to 100MB)

### Automatic Dashboard Generation
- Instant dashboard on file upload — no manual configuration
- Intelligent visualization selection based on data type
- Auto-detected KPIs (revenue, profit, customers, etc.)
- 11+ chart types: bar, line, area, pie, donut, scatter, histogram, heatmap, data table

### AI Analysis
- Statistical profiling (mean, median, std, quartiles, outliers)
- Data type detection (numeric, categorical, datetime, boolean)
- Missing value & duplicate detection
- Correlation analysis
- Dataset context detection (Sales, HR, Finance, Academic, etc.)

### AI Chat
- Natural language questions about your data
- Rule-based analytics (works without any API key)
- Optional OpenAI integration for advanced answers
- Chart generation from questions

### Export
- PDF reports with KPIs, charts, and insights
- CSV and Excel download
- Public shareable dashboard links

### Authentication
- Secure JWT-based authentication
- User registration and login
- Per-user data isolation
- Password reset flow

---

## ⚙️ Configuration

Edit `backend/.env`:

```env
# Database (SQLite for dev, PostgreSQL for production)
DATABASE_URL=sqlite:///./dataflow.db
# DATABASE_URL=postgresql://user:password@localhost:5432/dataflow_db

# Security
SECRET_KEY=your-secret-key-at-least-32-chars

# AI (optional - app works without this)
OPENAI_API_KEY=sk-your-key-here

# File uploads
MAX_FILE_SIZE_MB=100
```

---

## 🔧 Production Deployment

### Database: Switch to PostgreSQL
```env
DATABASE_URL=postgresql://dataflow_user:password@localhost:5432/dataflow_db
```

### Build Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

### Environment Variables
- Always set a strong `SECRET_KEY` in production
- Use environment variables for all secrets (never commit `.env`)
- Set `DEBUG=false` in production

---

## 🧪 Testing Sample Datasets

The application has been tested with:
- **Sales dataset** — revenue, products, regions, salespeople
- **HR dataset** — employees, salaries, departments
- **Finance dataset** — income, expenses, profit/loss
- **Student/Academic dataset** — grades, subjects, pass rates
- **JSON data** — nested objects, arrays
- **Excel with multiple sheets** — sheet selector UI

---

## 📡 API Reference

Full interactive docs at: http://localhost:8000/api/docs

Key endpoints:
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `POST /api/datasets/upload` — Upload file (multipart)
- `GET /api/datasets/{id}` — Get dataset + analysis
- `GET /api/datasets/{id}/preview` — Paginated data preview
- `GET /api/dashboards/` — List dashboards
- `GET /api/dashboards/{id}` — Get full dashboard
- `POST /api/analytics/chat` — AI chat with dataset
- `GET /api/analytics/insights/{id}` — Get AI insights
- `POST /api/analytics/chart-data` — Get filtered chart data
- `GET /api/dashboards/{id}/export/pdf` — Download PDF report

---

## 🛡️ Security

- Passwords hashed with bcrypt
- JWT tokens with configurable expiry
- Per-user data isolation enforced at database level
- File type and size validation
- SQL injection protection via SQLAlchemy ORM
- CORS configured for specific origins
- No secrets in frontend code

---

*DataFlow AI — Turn Your Data Into Decisions.*
