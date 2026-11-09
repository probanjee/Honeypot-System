#!/usr/bin/env bash
# ==============================================================================
# VIGILANCE & Nowhere Esports - Automated Azure VM Provisioning Script
# Targets: Ubuntu 22.04 LTS / 24.04 LTS on Microsoft Azure
# ==============================================================================

set -euo pipefail

echo "=================================================================="
echo "   VIGILANCE THREAT PLATFORM - AZURE VM DEPLOYMENT SETUP          "
echo "=================================================================="

# 1. Update OS and install prerequisites
echo "[1/6] Updating system packages and installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release ufw

# 2. Install official Docker Engine & Docker Compose Plugin
echo "[2/6] Installing official Docker CE & Docker Compose..."
sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Ensure current user can execute docker without sudo
sudo usermod -aG docker "$USER" || true

# 3. Configure Local Firewall
echo "[3/6] Configuring host firewall (Ports 22, 80, 443)..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

# 4. Generate or Validate .env
echo "[4/6] Verifying environment configuration (.env)..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    # Generate random Postgres password
    RANDOM_PASS=$(openssl rand -hex 16)
    sed -i "s/generate_a_secure_password_here/${RANDOM_PASS}/g" .env
    echo "[INFO] Generated new .env with randomized database credentials."
  else
    echo "[WARN] .env.example not found. Please create .env manually."
  fi
fi

# 5. Launch Full Stack with Production Compose
echo "[5/6] Building and launching VIGILANCE Core with Docker Compose..."
sudo docker compose -f docker-compose.prod.yml up -d --build

# 6. Verify Service Health
echo "[6/6] Verifying container health..."
sleep 10
sudo docker compose -f docker-compose.prod.yml ps

echo ""
echo "=================================================================="
echo "   DEPLOYMENT SUCCESSFUL!                                         "
echo "=================================================================="
echo "Nowhere Esports Decoy: http://$(curl -s ifconfig.me)/"
echo "Backend REST Health:   http://$(curl -s ifconfig.me)/api/v1/health"
echo "Backend SSE Stream:    http://$(curl -s ifconfig.me)/api/v1/stream/sse"
echo "=================================================================="
