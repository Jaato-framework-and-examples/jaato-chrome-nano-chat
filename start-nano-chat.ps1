<#
  start-nano-chat.ps1 — bring up (or tear down) the whole Nano Chat stack.

  Pieces, in dependency order:
    1. Nano Chrome        — headed Chrome on :9222 (dedicated profile) with Gemini
                            Nano provisioned. (The packed extension only loads if
                            Developer mode was enabled once — see NOTE below;
                            not needed to chat via the localhost URL.)
    2. Peer daemon        — jaato-server on the Linux peer, 127.0.0.1:8090,
                            HOME-isolated (plain ws, no TLS), --ws-unsafe-no-auth.
    3. SSH tunnels        — -L 8080:localhost:8090 (extension -> peer daemon)
                            -R 9222:[::1]:9222     (peer chrome_ai -> this Chrome)
    4. Host-page server   — python http.server on 127.0.0.1:8765 serving the
                            extension dir (the secure-origin page Nano runs on).

  Usage:
    ./start-nano-chat.ps1          # start everything that's not already up
    ./start-nano-chat.ps1 -Stop    # tear the stack down
    ./start-nano-chat.ps1 -NoChrome  # don't auto-launch Chrome (just check it)
#>
[CmdletBinding()]
param(
  [switch]$Stop,
  [switch]$NoChrome
)

# ---- config ---------------------------------------------------------------
$ExtDir      = "E:\Users\apanoia\SourceCode\nano-chat\extension"
$ChromeExe   = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
$ProfileDir  = "$env:USERPROFILE\.jaato\chrome_ai\profile"
$PeerHost    = "linux-peers"
$PeerDaemonPort = 8090
$WinDaemonPort  = 8080         # -L tunnel entrance on this box
$CdpPort     = 9222
$HostPort    = 8765
$PeerRepo    = "/home/apanoia/Sources/Jaato-framework-and-examples/jaato/jaato-server"
$PeerJaato   = "/home/apanoia/jaato-venv/bin/jaato-server"
$PeerHome    = "/tmp/nano-home"
$PeerLog     = "/tmp/peer/nano-daemon.log"
$PyExe       = "C:\Users\apanoia\AppData\Local\Programs\Python\Python312\python.exe"

# ---- helpers --------------------------------------------------------------
function Test-Cdp {
  try { $null = Invoke-RestMethod "http://[::1]:$CdpPort/json/version" -TimeoutSec 4; return $true }
  catch { return $false }
}
function Test-WinPort([int]$p) {
  [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}
function Test-HttpOk([string]$url) {
  try { $null = Invoke-WebRequest $url -TimeoutSec 4 -UseBasicParsing; return $true } catch { return $false }
}
function Test-PeerPort([int]$p) {
  (ssh -o BatchMode=yes $PeerHost "ss -ltn 2>/dev/null | grep -q ':$p ' && echo UP || echo DOWN").Trim() -eq "UP"
}
function Test-ReverseTunnel {
  # peer can reach this box's Chrome CDP through -R
  (ssh -o BatchMode=yes $PeerHost "curl -s --max-time 5 http://127.0.0.1:$CdpPort/json/version >/dev/null 2>&1 && echo UP || echo DOWN").Trim() -eq "UP"
}
function Get-TunnelProcs {
  Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" |
    Where-Object { ($_.CommandLine ?? '') -match "$WinDaemonPort`:localhost:$PeerDaemonPort" }
}

# ==========================================================================
#  STOP
# ==========================================================================
if ($Stop) {
  Write-Host "Tearing down Nano Chat stack..." -ForegroundColor Yellow
  # host server
  Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { ($_.CommandLine ?? '') -match "http.server $HostPort" } |
    ForEach-Object { Write-Host "  stop host-server pid $($_.ProcessId)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  # tunnel
  Get-TunnelProcs | ForEach-Object { Write-Host "  stop tunnel pid $($_.ProcessId)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  # peer daemon
  ssh -o BatchMode=yes $PeerHost "pid=`$(ss -ltnp 2>/dev/null | grep ':$PeerDaemonPort ' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2); [ -n `"`$pid`" ] && kill `$pid && echo 'stopped peer daemon '`$pid || echo 'peer daemon not running'" 2>&1 | ForEach-Object { Write-Host "  $_" }
  Write-Host "Chrome (:$CdpPort) left running — close it yourself if you want." -ForegroundColor DarkGray
  Write-Host "Done." -ForegroundColor Green
  return
}

# ==========================================================================
#  START
# ==========================================================================
Write-Host "Starting Nano Chat stack..." -ForegroundColor Cyan

# --- 1. Nano Chrome -------------------------------------------------------
if (Test-Cdp) {
  Write-Host "[1/4] Chrome CDP :$CdpPort already up." -ForegroundColor Green
} elseif ($NoChrome) {
  Write-Host "[1/4] Chrome CDP :$CdpPort DOWN and -NoChrome set — launch it yourself." -ForegroundColor Red
} else {
  Write-Host "[1/4] Launching Nano Chrome..."
  New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null
  # NOTE: --load-extension is INERT until Developer Mode is enabled once in this
  # profile (Chrome 149+ ignores the switch otherwise; the old
  # --disable-features=DisableLoadExtensionCommandLineSwitch workaround is stale).
  # One-time: open chrome://extensions in this window -> toggle "Developer mode"
  # -> "Load unpacked" -> select $ExtDir. After that the extension persists in
  # the profile and this --load-extension also takes effect on relaunch.
  # (Not required to chat: http://localhost:$HostPort/sidepanel.html is the same
  #  UI and works without loading the packed extension at all.)
  Start-Process -FilePath $ChromeExe -ArgumentList @(
    "--remote-debugging-port=$CdpPort",
    "--user-data-dir=$ProfileDir",
    "--no-first-run","--no-default-browser-check",
    "--enable-features=OptimizationGuideOnDeviceModel:on_device_model_execution_bypass_perf_check",
    "--load-extension=$ExtDir",
    "https://example.com"
  )
  for ($i=0; $i -lt 15 -and -not (Test-Cdp); $i++) { Start-Sleep 1 }
  if (Test-Cdp) { Write-Host "      Chrome up." -ForegroundColor Green }
  else { Write-Host "      Chrome did not expose CDP in time." -ForegroundColor Red }
}

# --- 2. Peer daemon -------------------------------------------------------
if (Test-PeerPort $PeerDaemonPort) {
  Write-Host "[2/4] Peer daemon :$PeerDaemonPort already up." -ForegroundColor Green
} else {
  Write-Host "[2/4] Starting peer daemon (HOME-isolated, plain ws, no-auth)..."
  $startCmd = "mkdir -p $PeerHome /tmp/peer; cd $PeerRepo && HOME=$PeerHome nohup $PeerJaato --web-socket 127.0.0.1:$PeerDaemonPort --ws-unsafe-no-auth --verbose > $PeerLog 2>&1 & echo started `$!"
  ssh -o BatchMode=yes $PeerHost $startCmd 2>&1 | ForEach-Object { Write-Host "      $_" }
  for ($i=0; $i -lt 12 -and -not (Test-PeerPort $PeerDaemonPort); $i++) { Start-Sleep 1 }
  if (Test-PeerPort $PeerDaemonPort) { Write-Host "      Peer daemon up." -ForegroundColor Green }
  else { Write-Host "      Peer daemon failed to bind — check $PeerLog on the peer." -ForegroundColor Red }
}

# --- 3. SSH tunnels -------------------------------------------------------
if ((Test-WinPort $WinDaemonPort) -and (Test-ReverseTunnel)) {
  Write-Host "[3/4] SSH tunnels already up (-L :$WinDaemonPort, -R :$CdpPort)." -ForegroundColor Green
} else {
  Write-Host "[3/4] (Re)opening SSH tunnels..."
  Get-TunnelProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep 1
  Start-Process -FilePath "ssh" -WindowStyle Hidden -ArgumentList @(
    "-N","-o","BatchMode=yes","-o","ServerAliveInterval=30","-o","ExitOnForwardFailure=yes",
    "-L","$WinDaemonPort`:localhost:$PeerDaemonPort",
    "-R","$CdpPort`:[::1]:$CdpPort",
    $PeerHost
  )
  for ($i=0; $i -lt 10 -and -not ((Test-WinPort $WinDaemonPort) -and (Test-ReverseTunnel)); $i++) { Start-Sleep 1 }
  if ((Test-WinPort $WinDaemonPort) -and (Test-ReverseTunnel)) { Write-Host "      Tunnels up." -ForegroundColor Green }
  else { Write-Host "      Tunnels not fully up (need port $WinDaemonPort free + peer able to reach Chrome)." -ForegroundColor Red }
}

# --- 4. Host-page server --------------------------------------------------
if (Test-HttpOk "http://localhost:$HostPort/host.html") {
  Write-Host "[4/4] Host-page server :$HostPort already up." -ForegroundColor Green
} else {
  Write-Host "[4/4] Starting host-page server..."
  Start-Process -FilePath $PyExe -WorkingDirectory $ExtDir -WindowStyle Hidden `
    -ArgumentList "-m","http.server","$HostPort","--bind","127.0.0.1"
  for ($i=0; $i -lt 8 -and -not (Test-HttpOk "http://localhost:$HostPort/host.html"); $i++) { Start-Sleep 1 }
  if (Test-HttpOk "http://localhost:$HostPort/host.html") { Write-Host "      Host-page server up." -ForegroundColor Green }
  else { Write-Host "      Host-page server failed to start." -ForegroundColor Red }
}

# --- status ---------------------------------------------------------------
Write-Host ""
Write-Host "Status:" -ForegroundColor Cyan
"{0,-22} {1}" -f "Nano Chrome :$CdpPort",   $(if (Test-Cdp) {"UP"} else {"DOWN"})            | Write-Host
"{0,-22} {1}" -f "Peer daemon :$PeerDaemonPort", $(if (Test-PeerPort $PeerDaemonPort) {"UP"} else {"DOWN"}) | Write-Host
"{0,-22} {1}" -f "Tunnel -L :$WinDaemonPort", $(if (Test-WinPort $WinDaemonPort) {"UP"} else {"DOWN"})   | Write-Host
"{0,-22} {1}" -f "Tunnel -R :$CdpPort",      $(if (Test-ReverseTunnel) {"UP"} else {"DOWN"})           | Write-Host
"{0,-22} {1}" -f "Host page :$HostPort",     $(if (Test-HttpOk "http://localhost:$HostPort/host.html") {"UP"} else {"DOWN"}) | Write-Host
Write-Host ""
Write-Host "Chat now:  open  http://localhost:$HostPort/sidepanel.html  in a browser tab." -ForegroundColor Green
Write-Host "Docked side panel (optional): in the Nano Chrome (:$CdpPort), enable" -ForegroundColor DarkGray
Write-Host "  Developer mode at chrome://extensions once, Load unpacked -> $ExtDir," -ForegroundColor DarkGray
Write-Host "  then click the 'Nano Chat' toolbar icon." -ForegroundColor DarkGray
Write-Host "Tear down with:  ./start-nano-chat.ps1 -Stop" -ForegroundColor DarkGray
