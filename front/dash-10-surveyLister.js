// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

// RouteApp:
const sl = { id: 'surveyLister', o: {}, c: {} }

// Observables & Computeds:
sl.c.surveyList = app.o.surveyMap.list // Alias, snap-friendly.

// Open: ///////////////////////////////////////////////////
sl.open = function () {
  // sl.fetchSurveyListIfReqd()
}
sl.fetchSurveyListIfReqd = async function () {
  if (app.o.surveyMap.isFetched.get()) {
    // ==> Already fetched.
    return app.o.surveyMap.list()
  }
  // ==> Not yet fetched.
  return await sl.fetchSurveyList()
}
sl.fetchSurveyList = async function () {
  misc.spinner.start('Fetching Surveys ...')
  const resp = await misc.postJson('/surveyCon/fetchSurveyList', {})
  // misc.alertJson(resp);
  app.o.surveyMap.updateMany(resp.surveyList)
  app.o.surveyMap.isFetched.set(true)
  misc.spinner.stop()
  return resp.surveyList
}

// Events: /////////////////////////////////////////////////
sl.onClick_newSurvey = async function () {
  const title = await misc.promptText('Survey Title (for internal use only)')
  if (!title) {
    return null // Short ckt.
  }
  misc.alert("This functionality hasn't yet been implemented.")
}

// Close:
sl.close = function () {
  $.noop()
}

// Export:
module.exports = sl
