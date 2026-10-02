#!/bin/bash
# Network watchdog, run from root's crontab every 5 minutes (see install.sh).
#
# NetworkManager reporting wlan0 as "connected" is not enough: the wifi link
# can hang while keeping its association and IP address, with no traffic
# getting through at all. So check what actually matters — whether the
# default gateway answers a ping — and recover in two steps:
#   1st failed run: restart NetworkManager to re-establish the wifi link.
#   2nd failed run in a row: reboot (at most once per hour, so a router
#   that is simply switched off doesn't put the board into a reboot loop).
# Only failures are logged: journalctl -t familyboard-network

IFACE=wlan0
FAIL_COUNT_FILE=/run/familyboard-network-fails
LAST_REBOOT_FILE=/var/tmp/familyboard-network-last-reboot
MIN_SECONDS_BETWEEN_REBOOTS=3600

log() {
  logger -t familyboard-network "$1"
}

gateway_reachable() {
  local gateway
  gateway=$(ip route show default dev "$IFACE" 2>/dev/null | awk '/default/ {print $3; exit}')
  if [ -z "$gateway" ]; then
    return 1
  fi
  ping -c 3 -W 3 -I "$IFACE" "$gateway" >/dev/null 2>&1
}

if gateway_reachable; then
  rm -f "$FAIL_COUNT_FILE"
  exit 0
fi

FAILS=$(($(cat "$FAIL_COUNT_FILE" 2>/dev/null || echo 0) + 1))
echo "$FAILS" > "$FAIL_COUNT_FILE"
log "gateway not reachable via $IFACE (state: $(nmcli -g GENERAL.STATE dev show "$IFACE" 2>/dev/null), consecutive failed checks: $FAILS)"

if [ "$FAILS" -lt 2 ]; then
  log "restarting NetworkManager"
  systemctl restart NetworkManager
  sleep 30
  if gateway_reachable; then
    log "gateway reachable again after restarting NetworkManager"
    rm -f "$FAIL_COUNT_FILE"
  fi
  exit 0
fi

NOW=$(date +%s)
LAST_REBOOT=$(cat "$LAST_REBOOT_FILE" 2>/dev/null || echo 0)
if [ $((NOW - LAST_REBOOT)) -lt "$MIN_SECONDS_BETWEEN_REBOOTS" ]; then
  log "still no network, but already rebooted less than an hour ago — restarting NetworkManager instead"
  systemctl restart NetworkManager
  exit 0
fi

log "still no network after restarting NetworkManager — rebooting"
echo "$NOW" > "$LAST_REBOOT_FILE"
/sbin/reboot
