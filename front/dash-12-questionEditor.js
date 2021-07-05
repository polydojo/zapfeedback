// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

const qe = { id: 'questionEditor', o: {}, c: {} }

// Observables & Computeds: ////////////////////////////////
qe.o.questionId = uk.observable(null)
qe.c.savedQuestion = uk.computed(
  function () {
    const questionId = qe.o.questionId.get()
    if (!questionId) { return null } // short ckt.
    const question = app.o.questionMap.get()[questionId]
    if (!question) { return null } // short ckt.
    // ==> question found.
    return question
  },
  [qe.o.questionId, app.o.questionMap]
)
qe.o.liveQuestion = uk.observable(null)
// ^-- live as in editable. Can be edited, and then (later) saved.

// Open: ///////////////////////////////////////////////////
qe.open = async function (info) {
  await app.questionLister.fetchQuestionListIfReqd()
  qe.o.questionId.set(info.questionId)
  const question = qe.c.savedQuestion.get()
  if (!question) {
    app.router.openDefault()
    return null // Short ckt.
  }
  qe.o.liveQuestion.set(question)
}

// Events: /////////////////////////////////////////////////
qe.onClick_addChoice = async function () {
  misc.spinner.start('Adding ...')
  const { choice } = await misc.postJson('/questionCon/buildChoice', {})
  // await misc.alertJson(choice)
  const liveQ = qe.o.liveQuestion.get()
  liveQ.choiceList.push(choice) // Non-observable update
  qe.o.liveQuestion.set(liveQ) // Update observably
  misc.spinner.stop()
}

qe.onSubmit_saveQuestion = async function (event) {
  const copyQ = uk.deepCopy(qe.o.liveQuestion.get())
  _.each(copyQ.choiceList, function (choice) {
    choice.weight = Number(choice.weight)
    // ^-- Convert string to number, in non-aliased copyQ.
  })
  const dataToSend = {
    question: copyQ
  }
  misc.spinner.start('Saving ...')
  const resp = await misc.postJson('/questionCon/updateQuestion', dataToSend)
  app.o.questionMap.updateOne(resp.question)
  misc.spinner.stop()
  await misc.alert('Saved!')
}

// Close: //////////////////////////////////////////////////
qe.close = function () {
  qe.o.questionId.set(null)
  qe.o.liveQuestion.set(null)
}

module.exports = qe
