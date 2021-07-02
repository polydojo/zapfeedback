# std:
import os
import sys

# pip-ext:
import waitress
import dotenv

# pip-int:
# n/a

# loc:
# DELAYED

print("")  # newline

assert len(sys.argv) == 2
envFilename = sys.argv[1]
for (key, value) in dotenv.dotenv_values(envFilename).items():
    if key not in os.environ:
        os.environ[key] = value

# loc:
from constants import K
from appHub import app
import bu


def run():
    if K.DEBUG is True:
        bu.bottle.debug(True)
        print("Enabled DEBUG mode.")
    print("Serving @ %s:%s ...\n" % (K.RUN_HOST, K.RUN_PORT))
    waitress.serve(app=app, host=K.RUN_HOST, port=K.RUN_PORT)


# Run: #####################################################
if __name__ == "__main__":
    run()

# Note
# ----
# Ways to run:
#
#   1. Without hot reload:
#           python appRun.py env-*.txt
#
#   2. With hot reload, for dev:
#           hupper -m appRun env-*.txt
#
# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
