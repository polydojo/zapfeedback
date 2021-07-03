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

assert K.CURRENT_QUESTION_V == 0
db = dotsi.fy({"questionBox": mongo.db.questionBox})  # Isolate

############################################################
# Question building and validation:                        #
############################################################

validateChoice = vf.dictOf(
    {
        "_id": utils.isObjectId,
        "text": vf.typeIs(str),
    }
)

_validateQuestionFormat = vf.dictOf(
    {
        "_id": utils.isObjectId,
        "_v": lambda x: x == K.CURRENT_QUESTION_V,
        #
        # Intro'd in _v0:
        #
        "shortName": vf.typeIs(str),
        "text": vf.typeIs(str),
        "choiceList": vf.listOf(validateChoice),
        "creatorId": utils.isObjectId,
        "createdAt": utils.isInty,
    }
)


def validateQuestion(question):
    assert _validateQuestionFormat(question)
    choiceIdList = utils.pluck(question.choiceList, "_id")
    assert len(choiceIdList) == len(set(choiceIdList))
    # ^-- Assert that each choice._id is unique.
    return True


def buildChoice(text=""):
    return dotsi.fy(
        {
            "_id": utils.objectId(),
            # NO "_v" as this is nested, not top-level object.
            "text": text,
        }
    )


def buildQuestion(creatorId, shortName="(Unnamed Survey)"):
    assert K.CURRENT_QUESTION_V == 0
    return dotsi.fy(
        {
            "_id": utils.objectId(),
            "_v": K.CURRENT_QUESTION_V,
            #
            # Intro'd in _v0:
            #
            "shortName": shortName,
            "text": "",
            "choiceList": [buildChoice(), buildChoice()],
            "creatorId": creatorId,
            "createdAt": utils.now(),
        }
    )


############################################################
# Adapting:
############################################################

questionAdp = stdAdpBuilder.buildStdAdp(
    str_fooBox="questionBox",
    str_CURRENT_FOO_V="CURRENT_QUESTION_V",
    int_CURRENT_FOO_V=K.CURRENT_QUESTION_V,
    func_validateFoo=validateQuestion,
)

# @questionAdp.addStepAdapter
# def stepAdapterCore_from_X_to_Y (questionY):   # NON-lambda func.
#    # question._v: X --> Y
#    # Added:
#    #   + foo
#    questionY.update({
#        "foo": "foobar",
#    });

assert questionAdp.getStepCount() == K.CURRENT_QUESTION_V

# Adaptation Checklist:
# Assertions will help you.
# You'll need to look at:
#   + constants.py
#   + questionMod.py
#       + top (K) assertion
#       + define stepAdapterCore_from_X_to_Y
#       + modify builder/s as needed
#       + modify validator/s as needed
#       + modify snip/s if any, as needed
#   + questionCon.py and others:
#       + modify funcs that call questionMod's funcs.


############################################################
# Getting:
############################################################


def getQuestion(q, shouldUpdateDb=True):
    "Questionry traditionally for a single question."
    assert type(q) in [str, dict]
    question = db.questionBox.find_one(q)
    if question is None:
        return None  # Short ckt.
    return questionAdp.adapt(question, shouldUpdateDb)


def getQuestionList(q=None, shouldUpdateDb=True):
    "Questionry traditionally for multiple questions."
    q = q or {}
    assert type(q) is dict
    adaptWrapper = (  # A wrapper around `adapt`, aware of `shouldUpdateDb`.
        lambda question: (questionAdp.adapt(question, shouldUpdateDb))  # , # NO COMMA
    )
    return utils.map(adaptWrapper, db.questionBox.find(q))


def getQuestionCount(q=None):
    return db.questionBox.count_documents(q or {})


############################################################
# Inserting, Updating & Deleting:
############################################################


def insertQuestion(question):
    "More or less blindly INSERTS question to db."
    assert validateQuestion(question)
    # print("inserting question: ", question);
    dbOut = db.questionBox.insert_one(question)
    assert dbOut.inserted_id == question._id
    return dbOut


def replaceQuestion(question):
    "More or less blindly REPLACES question in db."
    assert validateQuestion(question)
    dbOut = db.questionBox.replace_one({"_id": question._id}, question)
    assert dbOut.matched_count == 1 == dbOut.modified_count
    return dbOut


def deleteQuestion(question):
    "Deletes an unverified, invited."
    assert validateQuestion(question)
    dbOut = db.questionBox.delete_one({"_id": question._id})
    assert dbOut.deleted_count == 1
    return True


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
