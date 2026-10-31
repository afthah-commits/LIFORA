# LIFORA LAN Firewall Configuration Script
# Requires Administrator privileges

Write-Host "Configuring Windows Firewall for LIFORA LAN Access..." -ForegroundColor Cyan

# Check Wi-Fi profile
$wifiProfile = Get-NetConnectionProfile -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue
if ($wifiProfile) {
    Write-Host "Current Wi-Fi: $($wifiProfile.Name) [Category: $($wifiProfile.NetworkCategory)]" -ForegroundColor White
}

# 1. Add or update Firewall Rule for Vite Frontend (Port 5173)
$rule5173 = Get-NetFirewallRule -DisplayName "LIFORA Frontend (Port 5173)" -ErrorAction SilentlyContinue
if ($rule5173) {
    Remove-NetFirewallRule -DisplayName "LIFORA Frontend (Port 5173)" -ErrorAction SilentlyContinue
}
New-NetFirewallRule -DisplayName "LIFORA Frontend (Port 5173)" `
    -Direction Inbound `
    -LocalPort 5173 `
    -Protocol TCP `
    -Action Allow `
    -Profile Private `
    -Description "Allows mobile devices on same Wi-Fi to access LIFORA Vite frontend on port 5173"

Write-Host "[OK] Inbound rule created: LIFORA Frontend (TCP 5173) on Private Profile" -ForegroundColor Green

# 2. Add or update Firewall Rule for FastAPI Backend (Port 8000)
$rule8000 = Get-NetFirewallRule -DisplayName "LIFORA Backend (Port 8000)" -ErrorAction SilentlyContinue
if ($rule8000) {
    Remove-NetFirewallRule -DisplayName "LIFORA Backend (Port 8000)" -ErrorAction SilentlyContinue
}
New-NetFirewallRule -DisplayName "LIFORA Backend (Port 8000)" `
    -Direction Inbound `
    -LocalPort 8000 `
    -Protocol TCP `
    -Action Allow `
    -Profile Private `
    -Description "Allows mobile devices on same Wi-Fi to access LIFORA FastAPI backend on port 8000"

Write-Host "[OK] Inbound rule created: LIFORA Backend (TCP 8000) on Private Profile" -ForegroundColor Green

Write-Host "`nFirewall configuration completed successfully!" -ForegroundColor Cyan
Write-Host "Your Mobile URL: http://192.168.31.161:5173" -ForegroundColor Yellow
