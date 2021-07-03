// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

// RouteApp:
const ql = { id: 'questionLister', o: {}, c: {} }

// Observables & Computeds:
ql.c.questionList = app.o.questionMap.list // Alias, snap-friendly.

// Open: ///////////////////////////////////////////////////
ql.open = function () {
  ql.fetchQuestionListIfReqd()
}
ql.fetchQuestionListIfReqd = async function () {
  if (app.o.questionMap.isFetched.get()) {
    // ==> Already fetched.
    return app.o.questionMap.list()
  }
  // ==> Not yet fetched.
  return await ql.fetchQuestionList()
}
ql.fetchQuestionList = async function () {
  misc.spinner.start('Fetching Questions ...')
  const resp = await misc.postJson('/questionCon/fetchQuestionList', {})
  // misc.alertJson(resp);
  app.o.questionMap.updateMany(resp.questionList)
  app.o.questionMap.isFetched.set(true)
  misc.spinner.stop()
  return resp.questionList
}

// Events: /////////////////////////////////////////////////
ql.onClick_newQuestion = async function () {
  const shortName = await misc.promptText('Short Name (for internal use only)')
  if (!shortName) {
    return null // Short ckt.
  }
  const dataToSend = { shortName: shortName }
  misc.spinner.start('Creating ...')
  const resp = await misc.postJson('/questionCon/createQuestion', dataToSend)
  app.o.questionMap.updateOne(resp.question)
  misc.spinner.stop() // Stop spinner before opening another route
  app.router.setInfo({
    id: 'questionEditor',
    questionId: resp.question._id
  })
}

// Close:
ql.close = function () {
  $.noop()
}

// Export:
module.exports = ql
