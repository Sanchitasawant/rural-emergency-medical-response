# RURALCARE AI — LOCAL SETUP & DEVELOPMENT GUIDE

This document provides clear, step-by-step instructions for setting up and running **RuralCare AI** locally on Windows using VS Code without requiring any external tools.

---

## Prerequisites

- **OS**: Windows
- **Python**: Python 3.10+ (Tested on Python 3.14)
- **Node.js**: Node 18+ & npm
- **Database**: MySQL Server 8.0+ (Tested on MySQL 8.0.44 or XAMPP MySQL)
- **Database Name**: `ruralcare_ai`

---

## Database Preparation (MySQL / XAMPP)

Before starting the backend, ensure your local MySQL server is running.

### Option A: Standard MySQL Windows Service
1. Open PowerShell or Command Prompt as Administrator.
2. Ensure MySQL service is running:
   ```powershell
   net start MySQL80
   ```

### Option B: XAMPP MySQL
1. Open **XAMPP Control Panel**.
2. Click **Start** next to **MySQL** (and optionally Apache if needed).

### Database Initialization
Ensure the database `ruralcare_ai` exists:
```sql
CREATE DATABASE IF NOT EXISTS ruralcare_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## First-Time Setup Instructions

Open VS Code in the project root: `C:\Users\sanchita\Desktop\rural-emergency-ai`

### 1. Backend Setup

Open a terminal in VS Code (PowerShell):

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
```

### 2. Frontend Setup

Open a second terminal tab in VS Code:

```powershell
cd frontend
npm install
```

---

## Daily Local Development Workflow

Every time you open VS Code to work on or present RuralCare AI, run the following two commands in separate VS Code terminals:

### Terminal 1: Backend Server (Django)
```powershell
cd C:\Users\sanchita\Desktop\rural-emergency-ai\backend
.\venv\Scripts\Activate.ps1
python manage.py runserver
```

### Terminal 2: Frontend Dev Server (React + Vite)
```powershell
cd C:\Users\sanchita\Desktop\rural-emergency-ai\frontend
npm run dev
```

---

## Accessing the Application

Once both terminals are running:

- **Frontend Application**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API Root**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Backend Health Check**: [http://127.0.0.1:8000/api/health/](http://127.0.0.1:8000/api/health/)

---

## Testing & Verification Commands

### Run Django System Checks
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py check
```

### Run Full System Automated Audit
```powershell
python scratch/final_system_audit.py
```

### Run Frontend Build Validation
```powershell
cd frontend
npm run build
```
