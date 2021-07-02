"Misc. controller for static files, config, shortcuts etc."
# std:
import json

# pip-ext:
import bottle

# pip-int:
# n/a

# loc:
import bu
from appDef import app
from constants import K
import utils
import emailer

# Install required netloc:
utils.map(
    app.install,
    [
        bu.mkPlugin_enforeSchemeAndNetloc(K.APP_SCHEME, K.APP_NETLOC),
        bu.plugin_frameDeny,
        bu.plugin_timer,
    ],
)

# Static routing (front/) & templating (views/):
for dirPath in K.STATIC_DIR_PATHS:
    bu.addStaticFolder(app, dirPath)
for dirPath in K.VIEW_DIR_PATHS:
    bu.addTemplateFolder(dirPath)  # <-- General, not app-specific.

# Add shortcuts:
bu.addShortcuts(app, K.SHORTCUT_MAP)

# Configure bottle-related:
bu.setMemfileMax(K.MEMFILE_MAX)
bu.setCookieSecret(K.AUTH_COOKIE_SECRET)
bu.enableUnderscoreFriendlyRendering()

# Configure SMTP, default sender and enable sending:
if K.SMTP.HOST and K.SMTP.PORT and K.SMTP.USERNAME:
    emailer.setSmtpConfig(
        host=K.SMTP.HOST,
        port=K.SMTP.PORT,
        username=K.SMTP.USERNAME,
        password=K.SMTP.PASSWORD,
    )
    emailer.setDefaultSender(
        fromName=K.SMTP.DEFAULT_FROM_NAME,
        fromEmail=K.SMTP.DEFAULT_FROM_EMAIL,
    )
    emailer.enableSending()
else:
    print("Skipped SMTP config.")

# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
