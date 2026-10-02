#!/bin/bash
# Deploy the current checkout to a Familyboard Raspberry Pi over SSH.
#
# Run this from your development machine, from inside the familyboard repo
# checkout. There's no need to ever `git clone` this repo on the Pi itself —
# this script rsyncs it there.
#
# Normal mode (bash deliver2raspi.sh): rsyncs the repo to the Pi, rebuilds
# the Go binaries and the frontend, (re)installs the systemd services and
# logrotate config, restarts everything, and rebuilds the calendar config.
# Use this for every deploy once the Pi is set up.
#
# Bootstrap mode (bash deliver2raspi.sh --bootstrap): for a brand new Pi that
# has never run Familyboard before. Rsyncs the repo, then runs install.sh on
# the Pi over SSH (which installs Node.js/Go/Samba and everything else — see
# install.sh), then continues with the normal deploy steps below. install.sh
# only needs to run once per Pi: it refuses to run again (use plain
# deliver2raspi.sh for updates instead), so re-running --bootstrap by
# accident on an already-set-up Pi is a safe no-op for that step.
#
# --reinstall-deps: force a clean reinstall of node_modules on the Pi even
# if package.json/package-lock.json are unchanged since the last deploy.
#
# Requires SSH key access to the Pi as $PI_USER (no password prompt).

set -euo pipefail

# --- Configuration: adjust to your setup ---
PI_USER=admin
PI_HOST=familyboard.local
PI_DIR="/home/${PI_USER}/familyboard"
# --------------------------------------------

BOOTSTRAP=false
REINSTALL_DEPS=false
for arg in "$@"; do
  case "$arg" in
    --bootstrap) BOOTSTRAP=true ;;
    --reinstall-deps) REINSTALL_DEPS=true ;;
  esac
done

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE="${PI_USER}@${PI_HOST}"

echo "======== rsync files ========"
# backend-config.raspi.yaml is intentionally excluded from every regular
# deploy: it holds Pi-local state (e.g. calendar colors tweaked from the
# on-device config UI) that would otherwise get clobbered by whatever is
# checked out locally. It's only ever placed on the Pi once, during
# --bootstrap (see below).
rsync -rzP --delete \
  --exclude="*/iCalstore/*" \
  --exclude="*.log" \
  --exclude="*/node_modules/*" \
  --exclude=".next/" \
  --exclude="py-venv/" \
  --exclude="__pycache__/" \
  --exclude="backend-config.yaml" \
  --exclude="backend-config.local.yaml" \
  --exclude="backend-config.raspi.yaml" \
  --exclude="backend/data/*.json" \
  "${LOCAL_DIR}/" "${REMOTE}:${PI_DIR}/"

if [ "$BOOTSTRAP" = true ]; then
  echo "Bootstrapping a fresh Pi: install.sh does an apt upgrade and installs"
  echo "Node.js, Go, and npm dependencies from scratch, so this can easily take"
  echo "15-30+ minutes depending on the Pi model and network speed. Normal — let it run."

  echo "======== bootstrap: seeding backend-config.raspi.yaml (only if missing on the Pi) ========"
  if ssh "$REMOTE" "test -f ${PI_DIR}/backend/backend-config.raspi.yaml"; then
    echo "backend-config.raspi.yaml already exists on the Pi — leaving it untouched."
  else
    scp "${LOCAL_DIR}/backend/backend-config.raspi.yaml" "${REMOTE}:${PI_DIR}/backend/backend-config.raspi.yaml"
  fi

  echo "======== bootstrap: running install.sh on the Pi ========"
  # install.sh refuses to run if it already ran on this Pi before (exit 1) —
  # that's expected on a re-run, not a failure, so don't abort the deploy.
  if ! ssh "$REMOTE" "cd ${PI_DIR} && bash install.sh"; then
    echo "install.sh did not run (likely already installed on this Pi) — continuing with the regular deploy steps." >&2
  fi
fi

echo "======== build go executables ========"
ssh "$REMOTE" "cd ${PI_DIR}/backend/utils/calendarConfig && /usr/local/go/bin/go build"
ssh "$REMOTE" "cd ${PI_DIR}/backend/utils/calendarEvents && /usr/local/go/bin/go build"
ssh "$REMOTE" "cd ${PI_DIR}/backend/server && /usr/local/go/bin/go build"

echo "======== build webpage ========"
# Reinstalling node_modules from scratch takes minutes on a Pi, so only do
# it when the dependencies actually changed: the checksum of package.json +
# package-lock.json from the last install is kept inside node_modules
# (which rsync never touches) and compared against the freshly synced files.
# Pass --reinstall-deps to force a clean reinstall.
install_node_modules() {
  local dir="$1"
  ssh "$REMOTE" "
    set -e
    cd '${dir}'
    STAMP=node_modules/.familyboard-deps-checksum
    CURRENT=\$(cat package.json package-lock.json 2>/dev/null | sha256sum | cut -d' ' -f1)
    if [ '${REINSTALL_DEPS}' != true ] && [ -f \"\$STAMP\" ] && [ \"\$(cat \"\$STAMP\")\" = \"\$CURRENT\" ]; then
      echo \"${dir}: dependencies unchanged, keeping node_modules.\"
    else
      echo \"${dir}: dependencies changed (or first install), reinstalling node_modules.\"
      rm -rf node_modules
      npm install
      echo \"\$CURRENT\" > \"\$STAMP\"
    fi
  "
}
install_node_modules "${PI_DIR}/frontend"
ssh "$REMOTE" "cd ${PI_DIR}/frontend && npm run build"
install_node_modules "${PI_DIR}/backend/socketserver"

echo "======== install systemd service + logrotate files ========"
ssh "$REMOTE" "chmod +x ${PI_DIR}/backend/installation_files/run_kiosk.sh ${PI_DIR}/backend/installation_files/checkNetwork.sh"
for svc in familyboard-dataserver familyboard-npm familyboard-pir familyboard-kiosk familyboard-socketserver; do
  ssh "$REMOTE" "sudo cp ${PI_DIR}/backend/installation_files/${svc}.service /etc/systemd/system/${svc}.service"
done
ssh "$REMOTE" "sudo cp ${PI_DIR}/backend/installation_files/familyboard-logrotate /etc/logrotate.d/familyboard-logrotate"
ssh "$REMOTE" "sudo mkdir -p /etc/systemd/journald.conf.d && sudo cp ${PI_DIR}/backend/installation_files/familyboard-journald.conf /etc/systemd/journald.conf.d/90-familyboard.conf && sudo systemctl restart systemd-journald"
ssh "$REMOTE" "sudo systemctl daemon-reload"

echo "======== enable + restart services ========"
for svc in familyboard-dataserver familyboard-npm familyboard-pir familyboard-kiosk familyboard-socketserver; do
  ssh "$REMOTE" "sudo systemctl enable ${svc}.service"
  ssh "$REMOTE" "sudo systemctl restart ${svc}.service"
done

echo "======== run first time calendar config creation ========"
ssh "$REMOTE" "cd ${PI_DIR}/backend/utils/calendarConfig && FAMILYBOARD_CONFIG_FILE=backend-config.raspi.yaml ./buildCalendarConfigJson"

echo "======== done ========"
