# VPS Setup Guide — VU Budget App (Caddy Edition)

## What you need to install, configure, and create on your Ubuntu VPS (OVH Cloud)

---

## 1. System Updates & Prerequisites

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential sqlite3
```

## 2. Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # Should show v20.x
npm -v
```

## 3. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## 4. Firewall Setup (UFW)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```

## 5. DNS Configuration

In your domain registrar (or Cloudflare, etc.), create an **A record**:

| Type | Name    | Value          |
|------|---------|----------------|
| A    | budget  | YOUR_VPS_IP    |

This makes `budget.vidalpablo.com` point to your VPS.

## 6. Clone and Install the App

```bash
cd /opt
sudo mkdir vu-budget && sudo chown $USER:$USER vu-budget
git clone https://github.com/pabloandresvidal/vu-budget.git vu-budget
cd vu-budget

# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## 7. Environment Variables

Create a `.env` file in the project root:

```bash
nano /opt/vu-budget/.env
```

Contents:

```
PORT=3000
JWT_SECRET=generate-a-strong-random-string-here
NODE_ENV=production
OPENAI_API_KEY=sk-your-openai-api-key
```

Generate a strong JWT secret:

```bash
openssl rand -hex 32
```

## 8. Build the Frontend

```bash
cd /opt/vu-budget/client
npm run build
```

## 9. Start with PM2

```bash
cd /opt/vu-budget
pm2 start server/index.js --name vu-budget
pm2 save
pm2 startup   # Follow the instructions it prints
```

Verify it's running:

```bash
pm2 status
curl http://localhost:3000/api/health
```

## 10. Caddy Reverse Proxy (Multi-Domain)

Since you already use Caddy for n8n in Docker, follow these steps to add the budget app:

### A. Create the Caddyfile
```bash
sudo nano ~/n8n-docker/Caddyfile
```
Paste this inside:
```caddy
n8n.vidalpablo.com {
    reverse_proxy n8n:5678
}

budget.vidalpablo.com {
    reverse_proxy 172.17.0.1:3000
}
```

### B. Update `docker-compose.yml`
Open it:
```bash
sudo nano ~/n8n-docker/docker-compose.yml
```
1. **Remove** the `command:` line for Caddy.
2. **Add** this line under `volumes:` for `caddy`:
   ```yaml
     - ./Caddyfile:/etc/caddy/Caddyfile
   ```

### C. Restart Docker
```bash
cd ~/n8n-docker
sudo docker compose up -d
```

---

## 11. Verify Everything

```bash
# Check the app is running
pm2 status

# Test API
curl https://budget.vidalpablo.com/api/health

# Visit in browser
# https://budget.vidalpablo.com
```

---

## Summary of What's Needed

| Item | What to Do |
|------|-----------|
| **Node.js 20** | Install via NodeSource |
| **PM2** | `npm install -g pm2` |
| **Caddy** | Use existing Docker setup |
| **Caddyfile** | Map `budget.vidalpablo.com` to port 3000 |
| **UFW** | Allow ports 22, 80, 443 |
| **DNS A Record** | `budget` → VPS IP |
| **.env file** | `JWT_SECRET`, `OPENAI_API_KEY`, `PORT=3000` |
| **Build client** | `cd client && npm run build` |

## Useful PM2 Commands

```bash
pm2 status          # Check status
pm2 logs vu-budget  # View logs
pm2 restart vu-budget  # Restart app
```

## Updating the App

```bash
cd /opt/vu-budget
git pull origin main
cd server && npm install && cd ..
cd client && npm run build && cd ..
pm2 restart vu-budget
```
