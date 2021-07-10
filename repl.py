# std:
import os
import sys
from pprint import pprint, pformat

# pip-ext:
import waitress
import dotenv

# pip-int:
import dotsi

# loc:
# DELAYED

assert len(sys.argv) == 2
envFilename = sys.argv[1]
for (key, value) in dotenv.dotenv_values(envFilename).items():
    if key not in os.environ:
        os.environ[key] = value

# loc:
from constants import K
import utils
from mongo import db
import userMod

# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
