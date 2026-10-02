from gpiozero import MotionSensor, LED
from signal import pause
import glob
import os
import threading
from datetime import datetime
import time

os.environ['XDG_RUNTIME_DIR'] = '/run/user/1000'


def wayland_display():
    # The Wayland socket name (wayland-0, wayland-1, ...) depends on which
    # session slot the compositor claimed and isn't stable across OS
    # versions/reboots (see run_kiosk.sh for the same issue). Hardcoding
    # "wayland-1" here made every wlr-randr call below silently fail
    # (os.system swallows the exit code), so the screen was never actually
    # turned off, only the kiosk browser. Re-discover it on every call
    # rather than once at import time — this process runs for the service's
    # entire lifetime (days/weeks), and it starts early enough at boot
    # (After=graphical.target is not a hard guarantee, same as
    # familyboard-kiosk.service) that the socket may not exist yet the first
    # time this runs.
    sockets = sorted(
        p for p in glob.glob(os.path.join(os.environ['XDG_RUNTIME_DIR'], 'wayland-*'))
        if not p.endswith('.lock')
    )
    return os.path.basename(sockets[0]) if sockets else "wayland-0"  # fallback guess


def wlr_randr(args):
    env = f"WAYLAND_DISPLAY={wayland_display()}"
    os.system(f"{env} wlr-randr {args}")


pir = MotionSensor(23)
statusscreen= "off"

def switchScreenOff():
    global statusscreen
    # print(datetime.now(), "No Motion")
    statusscreen = "off"
    wlr_randr("--output HDMI-A-2 --off")
    os.system("sudo systemctl stop familyboard-kiosk.service")

timer = threading.Timer(60.0*10, switchScreenOff) # switch off after 10 minutes
timer.start() 




def switchScreenOn():
    global timer
    global statusscreen
    # print(datetime.now(), "Motion Detected")
    timer.cancel()
    if statusscreen == "off":
        statusscreen = "on"
        wlr_randr("--output HDMI-A-2 --on --transform 90")
        time.sleep(1)
        os.system("sudo systemctl start familyboard-kiosk.service")
    timer = threading.Timer(60.0*10, switchScreenOff) # switch off after 10 minutes
    timer.start()


pir.when_motion = switchScreenOn

pause()
