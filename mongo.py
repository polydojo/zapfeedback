# std:
# n/a

# pip-ext:
import pymongo

# pip-int:
# n/a

# loc:
from constants import K

mongoClient = pymongo.MongoClient(K.DATABASE_URL)
dbName = K.DATABASE_URL.split("/")[-1].split("?")[0]
db = mongoClient[dbName]  # <-- Raw database, not typo-safe.
