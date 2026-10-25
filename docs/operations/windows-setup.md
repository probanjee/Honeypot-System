# Operations Guide: Windows 11 Local Environment Setup

## 1. Overview & System Prerequisites
This guide documents the exact setup steps required to develop, run, and test **VIGILANCE** on Windows 11 using PowerShell, Python, Node.js, and Docker Desktop.

### Detected Tool Baseline:
- **OS**: Windows 11 (64-bit)
- **Shell**: PowerShell (`pwsh`)
- **Python**: 3.12+ (Python 3.14 verified in environment)
- **Node.js**: v20+ (Node.js v24.15.0 / npm 11.12.1 verified)
- **Docker**: Docker Desktop v29+ with WSL2 backend
- **Git**: Git for Windows 2.54+

---

## 2. Windows PowerShell Execution Policy Configuration

By default, Windows restricts execution of unsigned PowerShell scripts, which prevents virtual environment activation (`Activate.ps1`).

Open PowerShell as Administrator (or Current User) and execute:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

To verify:
```powershell
Get-ExecutionPolicy -List
```

---

## 3. Git CRLF / LF Line Ending Normalization

Because shell scripts (`.sh`) and container configurations will run inside Linux Docker containers, Windows CRLF line terminators can cause syntax errors (`/bin/sh: ^M: bad interpreter`).

Ensure Git preserves LF for script and code files:
```powershell
git config --global core.autocrlf false
git config --global core.eol lf
```

---

## 4. Python Virtual Environment Setup

Always create a dedicated virtual environment in the project root to keep system dependencies isolated:

```powershell
# In c:\Users\prosu\OneDrive\Desktop\Honeypot-System
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install baseline tools
python -m pip install --upgrade pip setuptools wheel
```

When activated, your prompt will display `(venv)`.

---

## 5. Docker Desktop & WSL2 Configuration

VIGILANCE utilizes Docker Compose to orchestrate Apache Kafka (KRaft), PostgreSQL, MongoDB, and Redis.

### 5.1 Starting Docker Desktop
If `docker ps` outputs:
`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
This indicates the Docker Desktop UI application has not been launched yet.

Start Docker Desktop via PowerShell:
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```
Wait 20–30 seconds for the Docker icon in the Windows notification tray to turn solid green.

### 5.2 Verifying Docker Daemon Connectivity
```powershell
docker info
docker compose version
```

---

## 6. Port Allocations & Windows Firewall

The local VIGILANCE stack binds to the following standard ports on `localhost`:
- `3000`: Nowhere Esports Intranet (Honeypot Sensor)
- `8000`: FastAPI Backend REST & SSE Stream
- `5173`: React + Vite Dashboard
- `5432`: PostgreSQL Database
- `27017`: MongoDB Evidence Store
- `9092`: Apache Kafka Broker (KRaft)
- `6379`: Redis Cache & Rate Limiting

If Windows Defender Firewall prompts you when starting services, select **"Allow access" on Private Networks**.
