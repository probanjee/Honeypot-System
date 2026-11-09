# VIGILANCE & Nowhere Esports: Cloud Deployment Guide

This guide details the steps to deploy the **VIGILANCE Defense Core + Nowhere Decoy Intranet** to **Microsoft Azure**, and the **VIGILANCE SOC Dashboard** to **Netlify** or **Vercel**.

---

## Architecture Overview

- **Microsoft Azure (Ubuntu VM or Container Apps)**:
  - Nginx Reverse Proxy (Ports 80 / 443)
  - Nowhere Esports Decoy Intranet (Express / Port 3000)
  - Analytical REST API & SSE Streaming (FastAPI / Port 8000)
  - Ingestion Worker (Python Consumer)
  - Apache Kafka in KRaft mode (Event streaming)
  - MongoDB 7.0 (Raw evidence store)
  - PostgreSQL 16 (Analytical store)
- **Netlify / Vercel (Edge CDN)**:
  - VIGILANCE SOC Dashboard (React / Vite SPA)

---

## Part 1: Deploying VIGILANCE on Microsoft Azure

### Step 1: Provision an Azure Virtual Machine
1. In the **Azure Portal**, create a new **Virtual Machine**:
   - **OS**: Ubuntu 22.04 LTS or 24.04 LTS
   - **Size**: `Standard_B2s` (2 vCPU, 4GB RAM) or `Standard_D2s_v5` (2 vCPU, 8GB RAM recommended for Kafka)
   - **Networking / Inbound Ports**: Allow `HTTP (80)`, `HTTPS (443)`, and `SSH (22)`.
2. Connect to your Azure VM via SSH:
   ```bash
   ssh azureuser@<YOUR_AZURE_VM_PUBLIC_IP>
   ```

### Step 2: Install Docker & Docker Compose
Run on your Azure VM:
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```
*(Log out and log back in for docker group permissions to take effect)*

### Step 3: Clone Repository & Configure Environment
```bash
git clone https://github.com/probanjee/Honeypot-System.git
cd Honeypot-System
git checkout main
```

Create `.env` file on the VM:
```bash
cp .env.example .env
nano .env
```
Fill in your secrets:
```env
RESEND_API_KEY=re_your_resend_api_key_here
POSTGRES_USER=vigilance_admin
POSTGRES_PASSWORD=ChooseAStrongPassword123!
POSTGRES_DB=vigilance_db
```

### Step 4: Launch Full Stack via Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify that all 7 containers are healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

Your decoy site is now live at `http://<YOUR_AZURE_VM_PUBLIC_IP>/`!
Your Backend REST API is live at `http://<YOUR_AZURE_VM_PUBLIC_IP>/api/v1/health`!

---

## Part 2: Deploying the SOC Dashboard to Vercel or Netlify

### Option A: Deploying on Vercel

1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import the `probanjee/Honeypot-System` repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `apps/dashboard`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `http://<YOUR_AZURE_VM_PUBLIC_IP>` (or your custom API domain e.g. `https://api.yourdomain.com`)
6. Click **Deploy**.

---

### Option B: Deploying on Netlify

1. Go to [netlify.com](https://netlify.com) and click **Add new site** $\rightarrow$ **Import an existing project**.
2. Select **GitHub** and authorize `probanjee/Honeypot-System`.
3. Set the build configuration:
   - **Base directory**: `apps/dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: `apps/dashboard/dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `http://<YOUR_AZURE_VM_PUBLIC_IP>`
5. Click **Deploy site**.

---

## Part 3: Adding Custom Domains & Free HTTPS (SSL)

Once your Azure VM is running:
1. Point your domain (e.g. `esports.yourdomain.com`) to your Azure VM IP via an `A` record in your DNS provider.
2. Install Certbot on Azure to enable automatic free Let's Encrypt SSL:
   ```bash
   sudo apt-get install -y certbot
   sudo certbot certonly --standalone -d esports.yourdomain.com
   ```
3. Update `deploy/nginx/nginx.conf` with your SSL certificates:
   ```nginx
   listen 443 ssl http2;
   ssl_certificate /etc/letsencrypt/live/esports.yourdomain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/esports.yourdomain.com/privkey.pem;
   ```
4. Restart Nginx:
   ```bash
   docker compose -f docker-compose.prod.yml restart nginx
   ```
