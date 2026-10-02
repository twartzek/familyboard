#!/bin/bash
sleep 1
# The Chromium binary is called "chromium-browser" on older Raspberry Pi OS
# releases (Debian Bullseye/Bookworm-based) and just "chromium" from Debian
# Trixie-based Raspberry Pi OS onward — pick whichever is actually installed.
if command -v chromium-browser >/dev/null 2>&1; then
  CHROMIUM_BIN=chromium-browser
else
  CHROMIUM_BIN=chromium
fi

# The Wayland socket name (wayland-0, wayland-1, ...) depends on which
# session slot the compositor claimed and isn't stable across OS
# versions/reboots, so discover it instead of hardcoding it. Wait a little
# in case the graphical session is still starting up.
if [ -z "${WAYLAND_DISPLAY:-}" ]; then
  for _ in $(seq 1 30); do
    SOCK=$(find "${XDG_RUNTIME_DIR:-/run/user/1000}" -maxdepth 1 -name 'wayland-*' ! -name '*.lock' 2>/dev/null | head -n1)
    if [ -n "$SOCK" ]; then
      export WAYLAND_DISPLAY
      WAYLAND_DISPLAY=$(basename "$SOCK")
      break
    fi
    sleep 1
  done
fi
# If a kanshi rotation profile is configured, wait for kanshi to actually be
# running and to have applied its transform before launching Chromium — a
# race at boot (familyboard-kiosk.service and lightdm/labwc's own autostart,
# which starts kanshi, both hang off graphical.target with no ordering
# between them; the .service file also orders this script after
# lightdm.service, but that only guarantees lightdm itself has started, not
# that labwc's autostart has gotten around to launching kanshi yet).
KANSHI_CONFIG="${HOME}/.config/kanshi/config"
if [ -f "$KANSHI_CONFIG" ] && grep -q 'transform' "$KANSHI_CONFIG" 2>/dev/null; then
  for _ in $(seq 1 30); do
    if pgrep -x kanshi >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  for _ in $(seq 1 20); do
    if wlr-randr 2>/dev/null | grep -q '^  Transform: [1-9]'; then
      break
    fi
    sleep 0.5
  done
fi

# Chromium persists its last window bounds (position + size in pixels, not
# just "maximized: true") to Preferences and restores exactly those pixel
# bounds on the next launch — including across a rotation. So if it was ever
# launched against the screen's pre-rotation (or otherwise different)
# geometry, every future launch keeps reopening at that stale, wrong-shaped
# size no matter how long we wait for the rotation above: this is a stored
# starting condition, not a startup race. Since this is a single-purpose
# kiosk profile with nothing else worth keeping, drop the stored bounds
# before every launch so Chromium re-derives them fresh against the current
# (already-rotated, thanks to the wait above) screen size.
PREFS_FILE="${HOME}/.config/chromium/Default/Preferences"
if [ -f "$PREFS_FILE" ]; then
  python3 -c "
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
data.get('browser', {}).pop('window_placement', None)
with open(path, 'w') as f:
    json.dump(data, f)
" "$PREFS_FILE" 2>/dev/null || true
fi

# firefox  http://localhost:3000/
# "$CHROMIUM_BIN" --hide-scrollbars --hide-crash-restore-bubble --lang=de  --ozone-platform=wayland --noerrdialogs --disable-crash-reporter --disable-infobars  --start-fullscreen --kiosk "http://localhost:3000/"
launch_chromium() {
  "$CHROMIUM_BIN" --hide-scrollbars --hide-crash-restore-bubble --lang=de  --ozone-platform=wayland --touch-events=enabled --noerrdialogs --disable-crash-reporter --disable-infobars --start-maximized --start-fullscreen  --app="http://localhost:3000/" &
  CHROMIUM_PID=$!
}

launch_chromium

# Even with the waits above, Chromium's window can still end up sized
# against a not-yet-settled/stale output geometry (the exact GPU/compositor
# readiness timing at boot has proven unreliable to predict — see git
# history/README for the debugging story), leaving it centered with black
# bars instead of filling the rotated screen. Verify what actually got
# rendered instead of guessing: screenshot it with grim and check whether
# the outermost edges (where the board's own UI always draws — the top
# calendar header and the bottom nav bar) are non-black; if not, the window
# is too small, so kill and relaunch once, which has proven to fix it after
# the display has had more time to settle.
if command -v grim >/dev/null 2>&1 && [ -n "${WAYLAND_DISPLAY:-}" ]; then
  sleep 8
  for attempt in 1 2; do
    PROBE=$(mktemp --suffix=.png)
    if grim "$PROBE" 2>/dev/null && python3 -c "
from PIL import Image
import sys
img = Image.open(sys.argv[1]).convert('RGB')
w, h = img.size
# Sample a handful of points along the very top and bottom edges.
edge_points = [(int(w * f), 2) for f in (0.1, 0.5, 0.9)] + \
              [(int(w * f), h - 3) for f in (0.1, 0.5, 0.9)]
non_black = sum(1 for p in edge_points if sum(img.getpixel(p)) > 20)
sys.exit(0 if non_black >= 4 else 1)
" "$PROBE" 2>/dev/null; then
      rm -f "$PROBE"
      break
    fi
    rm -f "$PROBE"
    if [ "$attempt" = 2 ]; then
      break
    fi
    kill "$CHROMIUM_PID" 2>/dev/null
    wait "$CHROMIUM_PID" 2>/dev/null
    sleep 2
    launch_chromium
    sleep 8
  done
fi

wait "$CHROMIUM_PID"
