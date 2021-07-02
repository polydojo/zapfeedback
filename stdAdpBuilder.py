# std:
import re

# pip-ext:
# n/a

# pip-int:
import dotsi

# loc:
from constants import K
import mongo
import utils


def buildStdAdp(
    str_fooBox,
    str_CURRENT_FOO_V,
    int_CURRENT_FOO_V,
    func_validateFoo,
):

    assert K[str_CURRENT_FOO_V] == int_CURRENT_FOO_V
    # ^-- Ala:: assert K.CURRENT_USER_V == 1;
    db = dotsi.fy({"fooBox": mongo.db[str_fooBox]})
    # ^-- Only fooBox accessible on db, pointing to mongo.db[str_fooBox]
    #     Eg: if str_fooBox = 'userBox', db.userBox -> mongo.db.userBox;

    stepAdapterList = []

    def addStepAdapter(stepAdapterCore):
        # print("adding step adapter: ", stepAdapterCore)
        fromV, toV = map(int, re.findall(r"\d+", stepAdapterCore.__name__))
        assert toV == fromV + 1
        assert len(stepAdapterList) == fromV

        def fullStepAdapter(fooX):
            ### Prelims: ###
            assert fooX._v == fromV
            fooY = dotsi.fy(utils.deepCopy(fooX))
            # ^-- Non-alias copy, ensures incoming `fooX` remains untouched.
            ### Core: ###
            stepAdapterCore(fooY)
            # ^-- Change fooY. It's a non-alias copy, safe to work with.
            ### Finishing: ###
            assert fooY._v == fromV
            # ^-- After core logic, ._v is still unchanged. We change it next.
            fooY._v += 1
            assert fooY._v == toV
            return fooY
            # Finally, return the adapted fooY.

        stepAdapterList.append(fullStepAdapter)
        assert len(stepAdapterList) == toV
        return stepAdapterCore
        # ^-- Decorator-friendly, identity-func-style return statement.

    def adapt(foo, shouldUpdateDb=True):
        assert K[str_CURRENT_FOO_V] == int_CURRENT_FOO_V
        foo = dotsi.fy(foo)
        preV = foo._v
        # <-- Previous (pre-adapting) version.
        itrV = preV
        # <-- Incrementing loop variable.
        while itrV < K[str_CURRENT_FOO_V]:
            stepAdapter = stepAdapterList[itrV]
            foo = stepAdapter(foo)
            assert foo._v == itrV + 1
            itrV = foo._v
            # Update (increment) loop var.
        assert itrV == K[str_CURRENT_FOO_V]
        assert func_validateFoo(foo)
        if shouldUpdateDb and (preV < K[str_CURRENT_FOO_V]):
            # ==> The (previous) foo was adapted. So, update db:
            dbOut = db.fooBox.replace_one({"_id": foo._id}, foo)
            # ^-- Remember that db.fooBox --points-to--> mongo.db[str_fooBox];
            assert dbOut.matched_count == 1 == dbOut.modified_count
        return foo

    # Export the built standard ADP bundle:
    return dotsi.fy(
        {
            "addStepAdapter": addStepAdapter,
            "adapt": adapt,
            "getStepCount": lambda: len(stepAdapterList),
        }
    )
    # Exo:  userAdp = stdAdpBuilder.buildStdAdp(..)
    #       userAdp.addStepAdapter(..)
    #       user = userAdp.adapt(db.userBox.find_one({..}));


############################################################
# EXO Usage Sample:
############################################################
"""
userAdp = stdAdpBuilder.buildStdAdp(
    str_fooBox = "userBox",
    str_CURRENT_FOO_V = "CURRENT_USER_V",
    int_CURRENT_FOO_V = K.CURRENT_USER_V,
    func_validateFoo = validateUser,
);

@userAdp.addStepAdapter
def stepAdapterCore_from_0_to_1 (userY):    # NON-lambda func.
    # user._v: 0 --> 1
    # Renamed:
    #   ~ 'name' --> 'fullname'
    userY.update({
        "fullname": userY.pop("name"),
    });

assert userAdp.getStepCount() == K.CURRENT_USER_V;

# Checklist:
# Assertions will help you.
# You'll need to look at:
#   + constants.py
#   + userMod.py
#       + top (K) assertion
#       + define stepAdapterCore_from_X_to_Y
#       + modify builder/s as needed
#       + modify validator/s as needed
#       + modify snip/s as needed
#   + userCon.py and others:
#       + modify funcs that call userMod.build"""

# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
