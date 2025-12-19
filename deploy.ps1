# Vaulted Deployment Script
# Usage: .\deploy.ps1 -Email "your@email.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [string]$SSHKey = "D:\keys\ssh-key-2025-12-19.key",
    [string]$Server = "ubuntu@152.67.154.15",
    [string]$Domain = "vaulted.root.sx"
)

Write-Host "Deploying Vaulted to VPS..." -ForegroundColor Cyan

# Step 1: Deploy latest code
Write-Host "`nDeploying code to VPS..." -ForegroundColor Yellow
$deployCmd = @'
cd ~/vaulted && git pull && npm install && npm run build && cd server && npm install && npm run build && pm2 restart vaulted-api && pm2 save
'@

ssh -i $SSHKey $Server $deployCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Code deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Code deployed successfully" -ForegroundColor Green

Write-Host "Code deployed successfully" -ForegroundColor Green

# Step 2: Setup SSL Certificate
Write-Host "`nSetting up SSL certificate..." -ForegroundColor Yellow
ssh -i $SSHKey $Server "sudo certbot --nginx -d $Domain --non-interactive --agree-tos --email $Email --redirect"

if ($LASTEXITCODE -ne 0) {
    Write-Host "SSL setup failed - you may need to run certbot manually" -ForegroundColor Yellow
} else {
    Write-Host "SSL certificate installed" -ForegroundColor Green
}

# Step 3: Ensure PM2 starts on boot
Write-Host "`nConfiguring PM2 to start on boot..." -ForegroundColor Yellow
$startupCmd = ssh -i $SSHKey $Server "pm2 startup systemd -u ubuntu --hp /home/ubuntu" | Select-String "sudo"
if ($startupCmd) {
    ssh -i $SSHKey $Server $startupCmd.Line
}
ssh -i $SSHKey $Server "pm2 save"

Write-Host "PM2 configured for auto-start" -ForegroundColor Green

# Step 4: Check status
Write-Host "`nCurrent Status:" -ForegroundColor Cyan
Write-Host "Backend API:" -ForegroundColor White
ssh -i $SSHKey $Server "pm2 status vaulted-api"

Write-Host "`nNginx:" -ForegroundColor White
ssh -i $SSHKey $Server "sudo systemctl status nginx --no-pager | head -10"

Write-Host "`nDeployment Complete!" -ForegroundColor Green
Write-Host "Your app is now running at: https://$Domain" -ForegroundColor Cyan
Write-Host "`nMonitoring commands:" -ForegroundColor Yellow
Write-Host "  pm2 logs vaulted-api          - View backend logs"
Write-Host "  pm2 monit                     - Monitor processes"
Write-Host "  sudo tail -f /var/log/nginx/error.log  - Nginx errors"
