# std:
import hashlib
import hmac
import re
import secrets

# pip-ext:
import pymongo

# pip-int:
import dotsi
import vf

# loc:
from constants import K
import mongo
import utils
import bu
import hashUp
import stdAdpBuilder

############################################################
# Assertions & indexing:                                   #
############################################################

assert K.CURRENT_MAGITOK_V == 0
db = dotsi.fy({"magitokBox": mongo.db.magitokBox})  # Isolate

############################################################
# Magitok building and validation:                            #
############################################################


def genVeriCode():
    return secrets.token_urlsafe()


validateMagitok = vf.dictOf(
    {
        "_id": utils.isStr,
        "_v": lambda x: x == K.CURRENT_MAGITOK_V,
        #
        # Intro'd in _v0:
        "hToken": vf.typeIs(str),  # Hashed Token
        "issuedAt": utils.isInty,
    },
)


def buildMagitok(magitokId, token):
    assert K.CURRENT_MAGITOK_V == 0
    assert type(magitokId) == str == type(token)
    return dotsi.fy(
        {
            "_id": magitokId,
            "_v": K.CURRENT_MAGITOK_V,
            #
            # Intro'd in _v0:
            #
            "hToken": utils.hashPw(token),
            "issuedAt": utils.now(),
        }
    )


############################################################
# Adapting:
############################################################

magitokAdp = stdAdpBuilder.buildStdAdp(
    str_fooBox="magitokBox",
    str_CURRENT_FOO_V="CURRENT_MAGITOK_V",
    int_CURRENT_FOO_V=K.CURRENT_MAGITOK_V,
    func_validateFoo=validateMagitok,
)

# @magitokAdp.addStepAdapter
# def stepAdapterCore_from_X_to_Y (magitokY):    # NON-lambda func.
#    # magitok._v: X --> Y
#    # Added:
#    #   + foo
#    magitokY.update({
#        "foo": "foobar",
#    });

assert magitokAdp.getStepCount() == K.CURRENT_MAGITOK_V

# Adaptation Checklist:
# Assertions will help you.
# You'll need to look at:
#   + constants.py
#   + magitokMod.py
#       + top (K) assertion
#       + define stepAdapterCore_from_X_to_Y
#       + modify builder/s as needed
#       + modify validator/s as needed
#       + modify snip/s if any, as needed
#   + magitokCon.py and others:
#       + modify funcs that call magitokMod's funcs.

############################################################
# Getting:
############################################################


def getMagitok(q, shouldUpdateDb=True):
    "Query traditionally for a single magitok."
    q = {"_id": q} if type(q) is str else q
    assert type(q) is dict
    magitok = db.magitokBox.find_one(q)
    if magitok is None:
        return None
    return magitokAdp.adapt(magitok, shouldUpdateDb)


"""
def getMagitokList(q=None, shouldUpdateDb=True):
    "Query traditionally. No special treatment for emails."
    q = q or {}
    assert type(q) is dict
    adaptWrapper = lambda magitok: (
        # ^-- A wrapper around `adapt`, aware of `shouldUpdateDb`.
        magitokAdp.adapt(magitok, shouldUpdateDb)  # , # NO COMMA
    )
    return utils.map(adaptWrapper, db.magitokBox.find(q))
"""  # ^-- Not req'd


def getMagitokCount(q=None):
    return db.magitokBox.count_documents(q or {})


############################################################
# Inserting, Updating & Deleting:
############################################################


"""
def insertMagitok(magitok):
    "More or less blindly INSERTS magitok to db."
    # Used primarily for inviting magitoks.
    assert validateMagitok(magitok)
    # print("inserting magitok: ", magitok);
    dbOut = db.magitokBox.insert_one(magitok)
    assert dbOut.inserted_id == magitok._id
    return dbOut


def replaceMagitok(magitok):
    "More or less blindly REPLACES magitok in db."
    # Used primarily for updating fname/password/etc of logged-in magitok.
    assert validateMagitok(magitok)
    dbOut = db.magitokBox.replace_one({"_id": magitok._id}, magitok)
    assert dbOut.matched_count == 1 == dbOut.modified_count
    return dbOut
"""  # ^-- Not req'd


def upsertMagitok(magitok):
    "More or less blindly upserts magitok to db."
    assert validateMagitok(magitok)
    # print("upserting magitok: ", magitok);
    dbOut = db.magitokBox.replace_one(
        {"_id": magitok._id},
        magitok,
        upsert=True,
    )
    assert (
        dbOut.upserted_id == magitok._id
        or dbOut.matched_count == 1 == dbOut.modified_count  # _OR_  # or
    )
    return dbOut


def deleteMagitok(magitok):
    "Deletes an unverified, invited."
    assert validateMagitok(magitok)
    dbOut = db.magitokBox.delete_one({"_id": magitok._id})
    assert dbOut.deleted_count == 1
    return True


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
