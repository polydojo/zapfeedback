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


@app.get("/choose/<questionId>/<choiceId>")
def get_hit_questionId_choiceId(questionId, choiceId):
    email = bu.get_qdata().get("email", "")
    question = questionMod.getQuestion(
        {
            "_id": questionId,
            "choiceList": {"$elemMatch": {"_id": choiceId}},
        }
    )
    assert bu.claim(question)
    choice = [c for c in question.choiceList if c._id == choiceId][0]
    assert bu.claim(choice)
    answer = answerMod.buildAnswer(
        questionId=question._id,
        choiceId=choice._id,
        thenChoiceText=choice.text,
        thenChoiceWeight=choice.weight,
        email=email,
    )
    assert answerMod.validateAnswer(answer)
    answerMod.insertAnswer(answer)
    # return {"answer": answer}
    return bu.redirect(f"/front/thanks.html?answerId={answer._id}&askEmail={not email}")


@app.post("/answerCon/fetchAnswerListByQuestionId")
@auth.seshful
def post_answerCon_fetchAnswerList(sesh):
    jdata = bu.get_jdata(ensure="questionId")
    question = questionMod.getQuestion(jdata.questionId)
    assert bu.claim(question)
    answerList = answerMod.getAnswerList({"questionId": question._id})
    return {"answerList": answerList}


@app.post("/answerCon/supplyProp")
def post_answerCon_supplyProp():
    jdata = bu.get_jdata(ensure="answerId, prop")
    prop = jdata.prop  # Local shorthand.
    assert prop in ["email", "comment"]
    assert prop in jdata and jdata[prop]
    answer = answerMod.getAnswer(jdata.answerId)
    assert bu.claim(answer)
    if answer[prop]:
        if answer[prop] == jdata[prop]:
            return {"status": "success"}
        else:
            return bu.abort("Property mismatch error.")
    # ==> answer[prop] is falsy.
    assert answer[prop] == ""
    answer.update({prop: jdata[prop]})
    assert answerMod.validateAnswer(answer)
    answerMod.replaceAnswer(answer)
    return {"status": "success"}


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
