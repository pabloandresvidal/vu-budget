# VPS Setup Guide — VU Budget App

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

## 4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

## 5. Install Certbot (Let's Encrypt SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## 6. Firewall Setup (UFW)

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```

## 7. DNS Configuration

In your domain registrar (or Cloudflare, etc.), create an **A record**:

| Type | Name    | Value          |
|------|---------|----------------|
| A    | budget  | YOUR_VPS_IP    |

This makes `budget.vidalpablo.com` point to your VPS.

Allow up to 24h for DNS propagation (usually minutes with Cloudflare).

## 8. Clone and Install the App

```bash
cd /opt
sudo mkdir vu-budget && sudo chown $USER:$USER vu-budget
git clone YOUR_REPO_URL vu-budget  # or scp/rsync the files
cd vu-budget

# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## 9. Environment Variables

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

## 10. Build the Frontend

```bash
cd /opt/vu-budget/client
npm run build
```

This creates the `dist/` folder that Express will serve.

## 11. Start with PM2

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

## 12. Nginx Reverse Proxy

Create the Nginx config:

```bash
sudo nano /etc/nginx/sites-available/budget.vidalpablo.com
```

Contents:

```nginx
server {
    listen 80;
    server_name budget.vidalpablo.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/budget.vidalpablo.com /etc/nginx/sites-enabled/
sudo nginx -t          # Test config
sudo systemctl reload nginx
```

## 13. SSL Certificate (HTTPS)

```bash
sudo certbot --nginx -d budget.vidalpablo.com
```

Follow the prompts. Certbot will auto-configure Nginx for HTTPS.

Auto-renewal is set up automatically. Test it:

```bash
sudo certbot renew --dry-run
```

## 14. Verify Everything

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
| **Nginx** | Install + reverse proxy config |
| **Certbot** | Install + run for SSL |
| **UFW** | Allow ports 22, 80, 443 |
| **DNS A Record** | `budget` → VPS IP |
| **.env file** | `JWT_SECRET`, `OPENAI_API_KEY`, `PORT=3000` |
| **OpenAI API Key** | Get from https://platform.openai.com/api-keys |
| **Build client** | `cd client && npm run build` |

## Useful PM2 Commands

```bash
pm2 status          # Check status
pm2 logs vu-budget  # View logs
pm2 restart vu-budget  # Restart app
pm2 monit           # Live monitoring
```

## Updating the App

```bash
cd /opt/vu-budget
git pull              # or rsync new files
cd client && npm run build && cd ..
pm2 restart vu-budget
```
