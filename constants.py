# std:
import os
import json

# pip-ext:
# n/a

# pip-int:
import dotsi

# loc:
import envi

# Private `X`, container for anything not req'd @ client:
X = dotsi.Dict()

# Public `U`, container for things explicitly req'd @ client:
U = dotsi.Dict()

# Combined `K` contains keys from X & U. (They shouldn't clash keys.)
K = dotsi.Dict()

X.RUN_HOST = envi.read("HOST")
X.RUN_PORT = envi.read("PORT")

X.APP_SCHEME = envi.read("ENFORCE_SCHEME")
X.APP_NETLOC = envi.read("ENFORCE_NETLOC")
U.SITE_URL = "%s://%s" % (X.APP_SCHEME, X.APP_NETLOC)
# ^-- SITE_URL is req'd @ cli for question sharing.

X.DEBUG = bool(envi.read("DEBUG").upper() == "TRUE")
# ^-- XXX:Note: Case-insensitive comparison with __string__ "TRUE".


# Repository directory:
X.REPO_DIR = os.path.abspath(os.path.dirname(__file__))


def repoSlash(*paths):
    return os.path.join(X.REPO_DIR, *paths)


X.STATIC_DIR_PATHS = [
    repoSlash("front"),
    repoSlash("node_modules"),
]
X.VIEW_DIR_PATHS = [
    repoSlash("views"),
]

X.SHORTCUT_MAP = {
    # "/": "/front/login.html",
    "/setup": "/front/setup.html",
    "/login": "/front/login.html",
    "/logout": "/front/logout.html",
    "/dash": "/front/dash.html",
}


X.SECRET_KEY = envi.read("SECRET_KEY")

X.AUTH_COOKIE_SECRET = "auth-cookie-secret::" + X.SECRET_KEY
X.ANTI_CSRF_SECRET = "anti-csrf-secret::" + X.SECRET_KEY
U.REMEMBER_ME_DAY_COUNT = 30
# ^-- Available @ client, visible in (httpOnly) cookie anyway.

X.DATABASE_URL = envi.read("DATABASE_URL")

X.S3 = {
    "ENDPOINT": envi.read("S3_ENDPOINT"),
    "ACCESS_KEY": envi.read("S3_ACCESS_KEY_ID"),
    "ACCESS_SECRET": envi.read("S3_SECRET_ACCESS_KEY"),
    "BUCKET_NAME": envi.read("S3_BUCKET_NAME", "polydojo-kb-onprem"),
    "BUCKET_LOCATION": envi.read("S3_BUCKET_REGION", "us-east-2"),
}

X.SMTP = {
    "HOST": envi.read("SMTP_HOST"),
    "PORT": int(envi.read("SMTP_PORT", "587")),
    "USERNAME": envi.read("SMTP_USERNAME"),
    "PASSWORD": envi.read("SMTP_PASSWORD"),
    "STARTTLS": (envi.read("SMTP_STARTTLS").lower() == "true"),
    # Quick defaults:
    "DEFAULT_FROM_NAME": envi.read("SMTP_FROM_NAME", "polydojo-kb-onprem"),
    "DEFAULT_FROM_EMAIL": envi.read(
        "SMTP_FROM_EMAIL", "polydojo-kb-onprem@example.com"
    ),
}
X.MEMFILE_MAX = 30 * 1000 * 1000
# ~ 30 MB

X.USER_EMAIL_INDEX_NAME = "user_email_index"

X.CURRENT_USER_V = 0
X.CURRENT_QUESTION_V = 0
X.CURRENT_ANSWER_V = 0

X.EMAIL_RE = r"^\S+@\S+\.\S+$"
X.PASSWORD_RE = r".{12,}"

U.GH_REPO_URL = "https://github.com/polydojo/zapfeedback"

# Anti-xss/mime-type related:
X.COMMON_XSS_SAFE_MIME_TYPE_WHITELIST = """
image/jpeg  image/png application/pdf
""".split()
# XXX:Note: This is _NOT_ an exhaustive whitelist.
#           It merely covers _very_ popular types.
#           TODO: Review periodically.


X.COMMON_XSS_PRONE_MIME_TYPE_BLACKLIST = """
text/html  application/xhtml+xml  image/svg+xml
application/xml application/xml+xhtml image/xml+svg
""".split()
# XXX:Note: This is _NOT_ an exhaustive blacklist.
#           (There can't be such a thing.)
#           TODO: Review periodically.


############################################################
### COLLECT INTO `K':                                      #
############################################################

assert set(U.keys()).intersection(X.keys()) == set()
# ^-- Assert that U and X have no common key. (Intersection empty.)
assert "U" not in U and "U" not in X
# ^-- Assert that "U" is neither a key in U nor in X.
assert "X" not in U and "X" not in X
# ^-- Assert that "X" is neither a key in U nor in X.

K.U = U
K.X = X
K.update(U)
K.update(X)

assert len(K) == len(U) + len(X) + 2
# ^-- K has each key from U and X, plus two keys: 'U' and 'X';

############################################################
### GENERATE './front/constants.js"                        #
############################################################

CONSTANTS_JS_CODE = (
    """
/*! Note: This file, constants.js, is server-generated.
 *  It should __NOT__ be edited by frontend developers.
 *  Any changes must be propagated through the backend.
 */

var K = %s;

module.exports = K;
"""
    % (json.dumps(K.U, indent=4),)
).strip()

CONSTANTS_JS_PATH = repoSlash("front/constants.js")
SHOULD_REWRITE_CONSTANTS_JS = False  # <-- Assumption

with open(CONSTANTS_JS_PATH, "r") as fr:
    readCode = fr.read()
    if readCode != CONSTANTS_JS_CODE:
        # print(repr(readCode))
        # print(repr(CONSTANTS_JS_CODE))
        SHOULD_REWRITE_CONSTANTS_JS = True  # <-- Correction

if SHOULD_REWRITE_CONSTANTS_JS:
    with open(CONSTANTS_JS_PATH, "w") as fw:
        fw.write(CONSTANTS_JS_CODE)
        print("Updated repo's front/constants.js.")
else:
    print("Repo's front/constants.js is unchanged.")

# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
