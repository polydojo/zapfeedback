# std:
# n/a

# pip-ext:
# n/a

# pip-int:
import dotsi
import vf

# loc:
from constants import K
import mongo
import utils
import bu
import stdAdpBuilder

############################################################
# Assertions & prelims:                                    #
############################################################

assert K.CURRENT_ANSWER_V == 1
db = dotsi.fy({"answerBox": mongo.db.answerBox})  # Isolate

############################################################
# Answer building and validation:                        #
############################################################

validateAnswer = vf.dictOf(
    {
        "_id": utils.isObjectId,
        "_v": lambda x: x == K.CURRENT_ANSWER_V,
        #
        # Intro'd in _v0:
        #
        "questionId": utils.isObjectId,
        "choiceId": utils.isObjectId,
        # "choiceText": vf.typeIs(str),  -- Renamed in _v1 to 'thenChoiceText'
        "email": vf.typeIs(str),  # TODO: Allow K.EMAIL_RE or "".
        "createdAt": utils.isInty,
        "comment": vf.typeIs(str),
        #
        # Intro'd in _v1:
        #
        "thenChoiceText": vf.typeIs(str),
        "thenChoiceWeight": utils.isInty,
    }
)


def buildAnswer(questionId, choiceId, thenChoiceText, thenChoiceWeight, email=""):
    assert K.CURRENT_ANSWER_V == 1
    return dotsi.fy(
        {
            "_id": utils.objectId(),
            "_v": K.CURRENT_ANSWER_V,
            #
            # Intro'd in _v0:
            #
            "questionId": questionId,
            "choiceId": choiceId,
            # "choiceText": choiceText, -- Renamed in _v1 to 'thenChoiceText'
            "email": email,
            "createdAt": utils.now(),
            "comment": "",
            #
            # Intro'd in _v1:
            #
            "thenChoiceText": thenChoiceText,
            "thenChoiceWeight": thenChoiceWeight,
        }
    )


############################################################
# Adapting:
############################################################

answerAdp = stdAdpBuilder.buildStdAdp(
    str_fooBox="answerBox",
    str_CURRENT_FOO_V="CURRENT_ANSWER_V",
    int_CURRENT_FOO_V=K.CURRENT_ANSWER_V,
    func_validateFoo=validateAnswer,
)


@answerAdp.addStepAdapter
def stepAdapterCore_from_0_to_1(answerY):  # NON-lambda func.
    # answer._v: 0 --> 1
    # Renamed:
    #   ~ choiceText --> thenChoiceText
    # Added:
    #   + thenChoiceWeight
    answerY.update(
        {
            "thenChoiceText": answerY.pop("choiceText"),
            "thenChoiceWeight": 0,  # Backfilling 0.
        }
    )


# @answerAdp.addStepAdapter
# def stepAdapterCore_from_X_to_Y (answerY):   # NON-lambda func.
#    # answer._v: X --> Y
#    # Added:
#    #   + foo
#    answerY.update({
#        "foo": "foobar",
#    });

assert answerAdp.getStepCount() == K.CURRENT_ANSWER_V

# Adaptation Checklist:
# Assertions will help you.
# You'll need to look at:
#   + constants.py
#   + answerMod.py
#       + top (K) assertion
#       + define stepAdapterCore_from_X_to_Y
#       + modify builder/s as needed
#       + modify validator/s as needed
#       + modify snip/s if any, as needed
#   + answerCon.py and others:
#       + modify funcs that call answerMod's funcs.


############################################################
# Getting:
############################################################


def getAnswer(q, shouldUpdateDb=True):
    "Answerry traditionally for a single answer."
    assert type(q) in [str, dict]
    answer = db.answerBox.find_one(q)
    if answer is None:
        return None  # Short ckt.
    return answerAdp.adapt(answer, shouldUpdateDb)


def getAnswerList(q=None, shouldUpdateDb=True):
    "Answerry traditionally for multiple answers."
    q = q or {}
    assert type(q) is dict
    adaptWrapper = (  # A wrapper around `adapt`, aware of `shouldUpdateDb`.
        lambda answer: (answerAdp.adapt(answer, shouldUpdateDb))  # , # NO COMMA
    )
    return utils.map(adaptWrapper, db.answerBox.find(q))


def getAnswerCount(q=None):
    return db.answerBox.count_documents(q or {})


############################################################
# Inserting, Updating & Deleting:
############################################################


def insertAnswer(answer):
    "More or less blindly INSERTS answer to db."
    assert validateAnswer(answer)
    # print("inserting answer: ", answer);
    dbOut = db.answerBox.insert_one(answer)
    assert dbOut.inserted_id == answer._id
    return dbOut


def replaceAnswer(answer):
    "More or less blindly REPLACES answer in db."
    assert validateAnswer(answer)
    dbOut = db.answerBox.replace_one({"_id": answer._id}, answer)
    assert dbOut.matched_count == 1 == dbOut.modified_count
    return dbOut


def deleteAnswer(answer):
    "Deletes an unverified, invited."
    assert validateAnswer(answer)
    dbOut = db.answerBox.delete_one({"_id": answer._id})
    assert dbOut.deleted_count == 1
    return True


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
