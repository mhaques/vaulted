# Quick Setup Guide for 24/7 Hosting

## Prerequisites
✅ VPS running (152.67.154.15)
✅ Domain configured (vaulted.root.sx → 152.67.154.15)
✅ Nginx installed and running
✅ PM2 installed
✅ Node.js 24.x installed

## 🚀 Deploy to Production

### Option 1: Automated Script (Recommended)

```powershell
# On your local machine
.\deploy.ps1 -Email "your-email@example.com"
```

This will:
1. Deploy latest code to VPS
2. Setup SSL certificate (HTTPS)
3. Configure PM2 to auto-start on boot
4. Restart all services

### Option 2: Manual Deployment

```bash
# SSH into VPS
ssh -i "D:\keys\ssh-key-2025-12-19.key" ubuntu@152.67.154.15

# Pull latest code
cd ~/vaulted
git pull

# Build frontend
npm install
npm run build

# Build backend
cd server
npm install
npm run build

# Restart backend
pm2 restart vaulted-api
pm2 save

# Setup SSL certificate
sudo certbot --nginx -d vaulted.root.sx --non-interactive --agree-tos --email your@email.com --redirect

# Configure PM2 to start on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu
# (copy and run the sudo command it outputs)
pm2 save
```

## 🔒 SSL Certificate (HTTPS)

Certbot will:
- Get free SSL certificate from Let's Encrypt
- Automatically configure Nginx
- Set up auto-renewal (certificates renew every 90 days)

Test auto-renewal:
```bash
sudo certbot renew --dry-run
```

## ⚡ Keep Backend Running 24/7

PM2 manages the backend API:

```bash
# View logs
pm2 logs vaulted-api

# Monitor performance
pm2 monit

# Restart if needed
pm2 restart vaulted-api

# Check status
pm2 status
```

PM2 startup script ensures it restarts after:
- Server reboot
- Crashes
- Updates

## 🌐 Access Your App

- **Production URL:** https://vaulted.root.sx
- **Backend API:** https://vaulted.root.sx/api
- **Health Check:** https://vaulted.root.sx/api/health

## 📊 Monitoring

### Check Backend Status
```bash
pm2 status
pm2 logs vaulted-api --lines 50
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Check SSL Certificate
```bash
sudo certbot certificates
```

## 🔄 Update Process

When you push code changes:

```powershell
# Local machine
git add .
git commit -m "your changes"
git push

# Then deploy
.\deploy.ps1 -Email "your@email.com"
```

## 🛠️ Troubleshooting

### Backend not responding
```bash
pm2 logs vaulted-api
pm2 restart vaulted-api
```

### SSL certificate issues
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Frontend not updating
```bash
cd ~/vaulted
npm run build
sudo systemctl reload nginx
```

### Port conflicts
```bash
# Check what's using port 3456
sudo lsof -i :3456

# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443
```

## 📝 Current Configuration

**Frontend:** `/home/ubuntu/vaulted/dist`
**Backend:** PM2 process `vaulted-api` on port 3456
**Nginx:** Reverse proxy on port 80/443
**Database:** `/home/ubuntu/vaulted/server/data/vaulted.db`

## 🔐 Security Notes

- SSL/TLS encryption enabled (HTTPS)
- Backend API proxied through Nginx
- Real-Debrid API keys stored client-side only
- JWT tokens for authentication
- Firewall configured (ports 80, 443, 22 only)

## 💾 Backup Recommendations

Backup these directories regularly:
```bash
~/vaulted/server/data/  # User database
~/vaulted/.env          # Environment config
```

Example backup script:
```bash
#!/bin/bash
tar -czf ~/backup-$(date +%Y%m%d).tar.gz ~/vaulted/server/data/
```
