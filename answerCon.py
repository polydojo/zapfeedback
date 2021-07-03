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
        choiceText=choice.text,
        email=email,
    )
    assert answerMod.validateAnswer(answer)
    answerMod.insertAnswer(answer)
    # return {"answer": answer}
    return bu.redirect(f"/front/thanks.html?answerId={answer._id}&askEmail={not email}")


@app.post("/answerCon/fetchAnswerListByQuestionId")
def post_answerCon_fetchAnswerList():
    jdata = bu.get_jdata(ensure="questionId")
    sesh = auth.getSesh()
    question = questionMod.getQuestion(jdata.questionId)
    assert bu.claim(question)
    answerList = answerMod.getAnswerList({"questionId": question._id})
    return {"answerList": answerList}


# xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
