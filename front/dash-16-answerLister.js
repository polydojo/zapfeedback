// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

const al = { id: 'answerLister', o: {}, c: {} }

// Observables & Computeds: ////////////////////////////////
al.o.questionId = uk.observable(null)
// ^-- {queId: true} for each queId for which answers are fetched.
al.c.question = uk.computed(
  function () {
    const questionId = al.o.questionId.get()
    if (!questionId) { return null } // short ckt.
    const question = app.o.questionMap.get()[questionId]
    if (!question) { return null } // short ckt.
    // ==> question found.
    return question
  },
  [al.o.questionId, app.o.questionMap]
)
al.c.answerList = uk.computed(
  function () {
    const question = al.c.question.get()
    if (!question) {
      return [] // Short ckt.
    }
    return _.where(app.o.answerMap.list(), {
      questionId: question._id
    })
  },
  [al.c.question, app.o.answerMap]
)
al.c.statList = uk.computed(
  function () {
    const question = al.c.question.get()
    if (!question) { return [] } // Short ckt.
    const answerList = al.c.answerList.get()
    if (!answerList.length) { return [] } // Short ckt.
    // ^-- Short ckt'ing avoids dividing by zero.
    const statMap = {}
    // ^-- Mapping from choiceId to relevant stats/info.
    // Init statMap:
    _.each(question.choiceList, function (choice) {
      statMap[choice._id] = {
        choiceId: choice._id,
        count: 0,
        choiceText: choice.text || '(blank)',
        percent: 0
      }
    })
    // Update statMap:
    _.each(answerList, function (answer) {
      const cid = answer.choiceId // Local shorthand.
      console.log(misc.pretty(statMap))
      console.log(cid)
      console.assert(_.has(statMap, cid), 'Assert `cid` in statMap.')
      statMap[cid].count += 1
      statMap[cid].percent = (
        100 * statMap[cid].count / answerList.length
      )
    })
    return _.values(statMap)
  },
  [al.c.question, al.c.answerList]
)

// Open: ///////////////////////////////////////////////////
al.open = async function (info) {
  await app.questionLister.fetchQuestionListIfReqd()
  al.o.questionId.set(info.questionId)
  if (!al.c.question.get()) {
    app.router.openDefault()
    return null // Short ckt.
  }
  await al.fetchAnswerListIfReqd()
}
al.fetchAnswerListIfReqd = async function () {
  if (al.c.answerList.get().length) {
    return al.c.answerList.get() // Short ckt.
  }
  return await al.fetchAnswerList()
}
al.fetchAnswerList = async function () {
  misc.spinner.start('Fetching Answers ...')
  const dataToSend = { questionId: al.o.questionId.get() }
  const resp = await misc.postJson('/answerCon/fetchAnswerListByQuestionId', dataToSend)
  // misc.alertJson(resp);
  app.o.answerMap.updateMany(resp.answerList)
  misc.spinner.stop()
  return resp.questionList
}

// Events: /////////////////////////////////////////////////
al.onClick_refresh = function () {
  al.fetchAnswerList()
}

// Close: //////////////////////////////////////////////////
al.close = function () {
  al.o.questionId.set(null)
}

module.exports = al
