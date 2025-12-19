# Vaulted Deployment Guide

## Option 1: Raspberry Pi Self-Hosting (Recommended for Privacy)

This gives you full control, works anywhere with a custom domain, and keeps your viewing data private.

### Requirements
- Raspberry Pi 4 (2GB+ RAM recommended) or any Linux server
- MicroSD card (32GB+) or SSD
- Home internet connection
- (Optional) Custom domain (~$10/year)

### Step 1: Set Up Your Pi

```bash
# SSH into your Pi
ssh pi@raspberrypi.local

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Clone your repo
cd ~
git clone https://github.com/mhaques/vaulted.git
cd vaulted
```

### Step 2: Build & Configure

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Create production environment file
cat > .env << EOF
VITE_API_URL=https://your-domain.com
EOF

cat > server/.env << EOF
PORT=3456
DATABASE_PATH=./data/vaulted.db
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Build frontend for production
npm run build
```

### Step 3: Set Up PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'vaulted-api',
      cwd: './server',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3456
      }
    }
  ]
}
EOF

# Start the API server
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions it prints
```

### Step 4: Set Up Nginx (Web Server)

```bash
# Install Nginx
sudo apt install -y nginx

# Create site config
sudo tee /etc/nginx/sites-available/vaulted << EOF
server {
    listen 80;
    server_name your-domain.com;  # Or use _ for any

    # Frontend (static files)
    location / {
        root /home/pi/vaulted/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3456/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
        
        # For video streaming
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/vaulted /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

### Step 5: Get a Custom Domain + Remote Access

**Option A: Cloudflare Tunnel (Easiest - No port forwarding needed!)**

1. Get a free domain or buy one ($10/year from Cloudflare, Namecheap, etc.)
2. Add domain to Cloudflare (free plan)
3. Install Cloudflare Tunnel on Pi:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create vaulted

# Configure tunnel
cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: vaulted.your-domain.com
    service: http://localhost:80
  - service: http_status:404
EOF

# Create DNS record
cloudflared tunnel route dns vaulted vaulted.your-domain.com

# Run as service
sudo cloudflared service install
sudo systemctl start cloudflared
```

Now `https://vaulted.your-domain.com` works from anywhere!

**Option B: Tailscale (Best for personal use)**

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Access via Tailscale IP from any device with Tailscale installed
# e.g., http://100.x.x.x (your Pi's Tailscale IP)
```

**Option C: Traditional Port Forwarding + Dynamic DNS**

1. Forward ports 80/443 on your router to your Pi
2. Use a Dynamic DNS service (DuckDNS, No-IP) for a free subdomain
3. Set up Let's Encrypt for HTTPS:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.duckdns.org
```

---

## Option 2: VPS Hosting (Always-on, ~$5/month)

### Providers
- **Oracle Cloud**: FREE tier with 4 ARM cores, 24GB RAM (best value!)
- **Hetzner**: €3.79/mo for decent VPS
- **DigitalOcean**: $6/mo droplet
- **Vultr**: $6/mo

### Quick Setup on VPS

```bash
# On your VPS (Ubuntu)
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx

# Clone and build
git clone https://github.com/mhaques/vaulted.git
cd vaulted
npm install && npm run build
cd server && npm install

# Set up PM2
sudo npm install -g pm2
pm2 start npm --name "vaulted-api" -- start
pm2 save && pm2 startup

# Configure Nginx (same as Pi setup above)
# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

## Option 3: Docker Deployment (Any Platform)

Create these files in your repo:

**Dockerfile** (Frontend + API):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
WORKDIR /app/server
RUN npm ci --production
EXPOSE 3456
CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  vaulted:
    build: .
    ports:
      - "3456:3456"
    volumes:
      - ./data:/app/server/data
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-here
    restart: unless-stopped
```

Run with: `docker-compose up -d`

---

## My Recommendation

**For your use case (home + travel):**

1. **Raspberry Pi + Cloudflare Tunnel** = Best combo
   - Free (except domain ~$10/year)
   - No port forwarding hassle
   - Works through any firewall
   - Your data stays on your hardware
   - Custom domain with free SSL

2. **Alternative: Oracle Cloud Free Tier**
   - Completely free forever
   - 4 ARM cores, 24GB RAM
   - Always-on, no Pi to maintain
   - Just need a domain

---

## Quick Security Tips

1. **Never expose Real-Debrid API key** - Keep it in browser localStorage only
2. **Use HTTPS** - Cloudflare Tunnel or Let's Encrypt
3. **Set strong JWT_SECRET** - `openssl rand -hex 32`
4. **Keep system updated** - `sudo apt update && sudo apt upgrade`

---

## Updating Your Deployment

```bash
cd ~/vaulted
git pull
npm install
npm run build
cd server && npm install
pm2 restart all
```
