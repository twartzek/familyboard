#!/bin/bash
# One-time setup script for a fresh Raspberry Pi that will run Familyboard.
#
# You normally don't run this directly. From your development machine, run:
#   bash deliver2raspi.sh --bootstrap
# which rsyncs the repo to the Pi and then runs this script there over SSH —
# no need to ever `git clone` this repo on the Pi itself.
#
# Prerequisites (if running it directly): the repo checkout must already be
# present at /home/$LINUX_USER/familyboard, and this script must run ON the
# Pi as that user, from inside that checkout.
#
# What it does: installs Node.js and Go, disables wifi powersave, sets up the
# Samba share for the photo slideshow, installs the systemd services,
# logrotate config, and root crontab entries, optionally configures display
# rotation for a portrait touchscreen, and prints the remaining manual steps
# (things that genuinely can't be scripted, like raspi-config menus).

set -euo pipefail

# Linux user the Familyboard services run as
LINUX_USER=admin
FAMILYBOARD_DIR="/home/${LINUX_USER}/familyboard"
INSTALLED_MARKER="/home/${LINUX_USER}/.familyboard-installed"

if [ "$(id -un)" != "$LINUX_USER" ]; then
  echo "This script expects to run as user '$LINUX_USER' (current: $(id -un))." >&2
  echo "Either run it as that user, or edit LINUX_USER at the top of this script." >&2
  exit 1
fi

if [ "$(pwd)" != "$FAMILYBOARD_DIR" ]; then
  echo "Please run this script from $FAMILYBOARD_DIR (current: $(pwd))." >&2
  exit 1
fi

if [ -f "$INSTALLED_MARKER" ] && [ "${1:-}" != "--force" ]; then
  echo "Familyboard already appears to be installed on this Pi (found $INSTALLED_MARKER, from $(cat "$INSTALLED_MARKER"))." >&2
  echo "This script only needs to run once. For code/config updates, use 'bash deliver2raspi.sh' (without --bootstrap) from your development machine instead." >&2
  echo "If you really want to re-run the full install, pass --force. Every step here is idempotent and safe to repeat, but it will briefly restart Samba and the kiosk browser." >&2
  exit 1
fi

echo "This is a fresh install: apt upgrade, Node.js/Go downloads, and the"
echo "frontend/socketserver npm installs can easily take 15-30+ minutes"
echo "depending on the Pi model and network speed. This is normal — let it run."

echo "======== apt update/upgrade ========"
sudo apt update
sudo apt upgrade -y

echo "======== install Node.js 20 ========"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
  sudo apt-get install -y nodejs
fi
node --version
npm --version

echo "======== install Go 1.23.4 ========"
if ! command -v go >/dev/null 2>&1; then
  GO_TARBALL=go1.23.4.linux-arm64.tar.gz
  wget "https://go.dev/dl/${GO_TARBALL}" -O "/tmp/${GO_TARBALL}"
  sudo tar -C /usr/local -xzf "/tmp/${GO_TARBALL}"
  rm "/tmp/${GO_TARBALL}"

  if ! grep -q '/usr/local/go/bin' ~/.profile 2>/dev/null; then
    {
      echo 'PATH=$PATH:/usr/local/go/bin'
      echo 'GOPATH=$HOME/go'
    } >> ~/.profile
  fi
  # shellcheck source=/dev/null
  source ~/.profile
fi
go version

echo "======== install node_modules ========"
(cd frontend && npm install --force)
(cd backend/socketserver && npm install --force)

echo "======== disable wifi powersave ========"
sudo nmcli con mod preconfigured wifi.powersave disable || true

echo "======== install Samba ========"
sudo apt install -y samba samba-common-bin
sudo mkdir -p /media/fotos
sudo chown nobody:nogroup /media/fotos/
sudo chmod 777 /media/fotos/
sudo cp backend/installation_files/smb.conf /etc/samba/smb.conf
sudo systemctl restart smbd

echo "======== install kiosk display tools ========"
# run_kiosk.sh depends on these at runtime: wlr-randr (wait for/verify
# rotation), grim + python3-pil (screenshot-based verification that
# Chromium actually rendered at the right size, with a retry if not), and
# kanshi (applies HDMI rotation, see the "display rotation" step below).
# On Raspberry Pi OS Desktop these typically already come in as
# dependencies of the desktop image, but that's not guaranteed across
# images/versions, so install them explicitly rather than relying on that.
sudo apt install -y wlr-randr grim python3-pil kanshi

echo "======== install systemd services ========"
chmod +x backend/installation_files/run_kiosk.sh backend/installation_files/checkNetwork.sh
for svc in familyboard-dataserver familyboard-npm familyboard-pir familyboard-kiosk familyboard-socketserver; do
  sudo cp "backend/installation_files/${svc}.service" "/etc/systemd/system/${svc}.service"
done
sudo systemctl daemon-reload
for svc in familyboard-dataserver familyboard-npm familyboard-pir familyboard-kiosk familyboard-socketserver; do
  sudo systemctl enable "${svc}.service"
  sudo systemctl restart "${svc}.service"
done

echo "======== install logrotate config ========"
sudo cp backend/installation_files/familyboard-logrotate /etc/logrotate.d/familyboard-logrotate

echo "======== keep the systemd journal across reboots ========"
sudo mkdir -p /etc/systemd/journald.conf.d
sudo cp backend/installation_files/familyboard-journald.conf /etc/systemd/journald.conf.d/90-familyboard.conf
sudo systemctl restart systemd-journald

echo "======== build calendar config (first run) ========"
(cd backend/utils/calendarConfig && go build && FAMILYBOARD_CONFIG_FILE=backend-config.raspi.yaml ./buildCalendarConfigJson)

echo "======== display rotation (optional) ========"
# Two different mechanisms depending on the physical display:
# - The official Raspberry Pi DSI touchscreen is driven by the firmware/
#   kernel framebuffer and rotates via lcd_rotate/display_rotate in
#   /boot/firmware/config.txt (needs a reboot to take effect).
# - A regular HDMI monitor is handled by the Wayland compositor instead —
#   config.txt rotation doesn't apply to it under labwc/Wayland. It's
#   rotated with a kanshi output profile (~/.config/kanshi/config, picked up
#   live by the kanshi daemon already started in labwc's autostart, no
#   reboot needed).
BOOT_CONFIG=/boot/firmware/config.txt
ROTATION_JUST_ENABLED=false
DSI_ROTATED_ALREADY=false
if grep -q '^lcd_rotate=1' "$BOOT_CONFIG" 2>/dev/null && grep -q '^display_rotate=1' "$BOOT_CONFIG" 2>/dev/null; then
  DSI_ROTATED_ALREADY=true
fi
KANSHI_CONFIG="/home/${LINUX_USER}/.config/kanshi/config"
HDMI_ROTATED_ALREADY=false
if [ -f "$KANSHI_CONFIG" ] && grep -q 'transform 90' "$KANSHI_CONFIG" 2>/dev/null; then
  HDMI_ROTATED_ALREADY=true
fi

if [ "$DSI_ROTATED_ALREADY" = true ] || [ "$HDMI_ROTATED_ALREADY" = true ]; then
  echo "Rotation already configured, skipping."
elif [ -t 0 ]; then
  read -r -p "Rotate the display 90° for a portrait screen? [y/N] " ROTATE_ANSWER
  if [[ "$ROTATE_ANSWER" =~ ^[Yy]$ ]]; then
    read -r -p "Is this the official Raspberry Pi DSI touchscreen, or a regular HDMI monitor? [dsi/hdmi] " DISPLAY_KIND
    if [[ "$DISPLAY_KIND" =~ ^[Dd] ]]; then
      sudo sed -i '/^lcd_rotate=1$/d; /^display_rotate=1$/d' "$BOOT_CONFIG"
      {
        echo 'lcd_rotate=1'
        echo 'display_rotate=1'
      } | sudo tee -a "$BOOT_CONFIG" >/dev/null
      echo "Rotation added to ${BOOT_CONFIG}. Reboot required to take effect."
      ROTATION_JUST_ENABLED=true
    else
      HDMI_OUTPUT=$(sudo -u "$LINUX_USER" XDG_RUNTIME_DIR="/run/user/$(id -u "$LINUX_USER")" WAYLAND_DISPLAY=wayland-0 wlr-randr 2>/dev/null | head -n1 | awk '{print $1}')
      if [ -z "$HDMI_OUTPUT" ]; then
        echo "Could not detect the connected output via wlr-randr — skipping." >&2
        echo "Set it up manually later: write 'output <NAME> transform 90' to ${KANSHI_CONFIG}." >&2
      else
        mkdir -p "$(dirname "$KANSHI_CONFIG")"
        cat > "$KANSHI_CONFIG" <<EOF
profile familyboard {
    output ${HDMI_OUTPUT} transform 90
}
EOF
        chown "${LINUX_USER}:${LINUX_USER}" "$KANSHI_CONFIG"
        echo "Rotation added to ${KANSHI_CONFIG} for output ${HDMI_OUTPUT}."
        echo "Applied live by the kanshi daemon already running — no reboot needed."
      fi
    fi
  else
    echo "Skipping rotation."
  fi
else
  echo "Non-interactive shell — skipping rotation prompt. To enable it later, see README."
fi

echo "======== touchscreen: disable mouse emulation ========"
# Raspberry Pi OS writes mouseEmulation="yes" for the touchscreen into
# labwc's rc.xml, which turns every touch into a mouse event: dragging a
# finger then selects text in Chromium instead of scrolling. With it off,
# Chromium receives real touch events and scrolls/swipes natively.
LABWC_RC="/home/${LINUX_USER}/.config/labwc/rc.xml"
if grep -q 'mouseEmulation="yes"' "$LABWC_RC" 2>/dev/null; then
  sed -i 's/mouseEmulation="yes"/mouseEmulation="no"/g' "$LABWC_RC"
  # SIGHUP makes labwc reload rc.xml ("labwc --reconfigure" needs LABWC_PID,
  # which isn't set outside the compositor's own session)
  pkill -HUP -x labwc 2>/dev/null || true
  echo "Mouse emulation disabled in ${LABWC_RC}."
else
  echo "No mouse emulation configured, skipping."
fi

echo "======== install root crontab entries ========"
CRON_MARKER="# familyboard (managed by install.sh)"
CRON_JOBS=$(cat <<EOF
${CRON_MARKER}
0 4 * * *    /sbin/shutdown -r +5
@reboot /usr/sbin/iw wlan0 set power_save off > /home/${LINUX_USER}/power_save_log.txt 2>&1
*/5 * * * *  ${FAMILYBOARD_DIR}/backend/installation_files/checkNetwork.sh
*/1 * * * *  cd ${FAMILYBOARD_DIR}/backend/utils/calendarEvents && FAMILYBOARD_CONFIG_FILE=backend-config.raspi.yaml ${FAMILYBOARD_DIR}/backend/utils/calendarEvents/buildEventsJson >> ${FAMILYBOARD_DIR}/backend/logs/buildEventsJson.log 2>&1
@reboot cd ${FAMILYBOARD_DIR}/backend/utils/calendarConfig && FAMILYBOARD_CONFIG_FILE=backend-config.raspi.yaml ${FAMILYBOARD_DIR}/backend/utils/calendarConfig/buildCalendarConfigJson >> ${FAMILYBOARD_DIR}/backend/logs/buildCalendarConfigJson.log 2>&1
EOF
)
# Replace any previously installed familyboard block, then append the current one
EXISTING_CRON=$(sudo crontab -l 2>/dev/null | sed "/^${CRON_MARKER}\$/,\$d" || true)
printf '%s\n%s\n' "$EXISTING_CRON" "$CRON_JOBS" | sudo crontab -

date -Iseconds > "$INSTALLED_MARKER"

cat <<EOF

======== Manual steps still required ========

1. Disable onboard wifi power management at boot, if not already covered above:
   sudo nano /boot/firmware/config.txt
   # dtoverlay=disable-wifi   (only if using a USB wifi dongle instead)

2. Make sure Wayland is selected in raspi-config (Advanced Options).

3. Make sure backend/backend-config.raspi.yaml exists and is filled in. It's
   not created by this script — create/edit it on your development machine
   (copy backend/backend-config_template.yaml) and it will be copied here by
   deliver2raspi.sh on the next deploy. See README.md.

EOF

if [ "$ROTATION_JUST_ENABLED" = true ]; then
  if [ -t 0 ]; then
    read -r -p "Display rotation was just enabled and needs a reboot to take effect. Reboot now? [y/N] " REBOOT_ANSWER
    if [[ "$REBOOT_ANSWER" =~ ^[Yy]$ ]]; then
      echo "Rebooting..."
      sudo reboot
    else
      echo "Not rebooting. Run 'sudo reboot' on the Pi whenever you're ready."
    fi
  else
    echo "Display rotation was just enabled and needs a reboot to take effect."
    echo "Run 'sudo reboot' on the Pi whenever you're ready."
  fi
fi
