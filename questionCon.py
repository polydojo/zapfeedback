# std:
# n/a

# pip-ext:
# n/a

# pip-int:
import dotsi

# loc:
import bu
from appDef import app
from constants import K
import questionMod
import answerMod
import utils
import auth


@app.post("/questionCon/createQuestion")
@auth.seshful
def post_questionCon_createQuestion(sesh):
    jdata = bu.get_jdata(ensure="shortName")
    question = questionMod.buildQuestion(
        creatorId=sesh.user._id,
        shortName=jdata.shortName,
    )
    assert questionMod.validateQuestion(question)
    questionMod.insertQuestion(question)
    return {"question": question}


@app.post("/questionCon/fetchQuestionList")
@auth.seshful
def post_questionCon_fetchQuestionList(sesh):
    return {"questionList": questionMod.getQuestionList()}


@app.post("/questionCon/buildChoice")
@auth.seshful
def post_questionCon_buildChoice(sesh):
    return {"choice": questionMod.buildChoice()}


@app.post("/questionCon/updateQuestion")
@auth.seshful
def post_questionCon_updateQuestion(sesh):
    jdata = bu.get_jdata(ensure="question")
    newQuestion = jdata.question  # Local alias.
    assert questionMod.validateQuestion(newQuestion)
    oldQuestion = questionMod.getQuestion(newQuestion._id)
    # ^-- old => before update, new => updated.
    assert oldQuestion
    oldChoiceIdSet = set(utils.pluck(oldQuestion.choiceList, "_id"))
    newChoiceIdSet = set(utils.pluck(newQuestion.choiceList, "_id"))
    deletedChoiceIdSet = oldChoiceIdSet - newChoiceIdSet
    if deletedChoiceIdSet:
        return bu.abort("Choices can be added or edited, but NOT deleted.")
    if oldQuestion != newQuestion:
        questionMod.replaceQuestion(newQuestion)
    return {"question": newQuestion}


@app.post("/questionCon/deleteQuestion")
@auth.seshful
def post_questionCon_updateQuestion(sesh):
    assert sesh.user.isAdmin
    jdata = bu.get_jdata(ensure="questionId")
    question = questionMod.getQuestion(jdata.questionId)
    assert question
    # TODO: Periodic review req'd: Delete inner/linked documents.
    answerList = answerMod.getAnswerList({"questionId": question._id})
    for answer in answerList:
        answerMod.deleteAnswer(answer)
    questionMod.deleteQuestion(question)
    return {"deletedQuestionId": question._id}


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
