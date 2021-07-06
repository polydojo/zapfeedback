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
def post_questionCon_createQuestion():
    jdata = bu.get_jdata(ensure="shortName")
    sesh = auth.getSesh()
    question = questionMod.buildQuestion(
        creatorId=sesh.user._id,
        shortName=jdata.shortName,
    )
    assert questionMod.validateQuestion(question)
    questionMod.insertQuestion(question)
    return {"question": question}


@app.post("/questionCon/fetchQuestionList")
def post_questionCon_fetchQuestionList():
    sesh = auth.getSesh()
    return {"questionList": questionMod.getQuestionList()}


@app.post("/questionCon/buildChoice")
def post_questionCon_buildChoice():
    sesh = auth.getSesh()
    return {"choice": questionMod.buildChoice()}


@app.post("/questionCon/updateQuestion")
def post_questionCon_updateQuestion():
    jdata = bu.get_jdata(ensure="question")
    newQuestion = jdata.question  # Local alias.
    assert questionMod.validateQuestion(newQuestion)
    sesh = auth.getSesh()
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
def post_questionCon_updateQuestion():
    jdata = bu.get_jdata(ensure="questionId")
    sesh = auth.getSesh()
    assert sesh.user.isAdmin
    question = questionMod.getQuestion(jdata.questionId)
    assert question
    # TODO: Periodic review req'd: Delete inner/linked documents.
    answerList = answerMod.getAnswerList({"questionId": question._id})
    for answer in answerList:
        answerMod.deleteAnswer(answer)
    questionMod.deleteQuestion(question)
    return {"deletedQuestionId": question._id}


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
