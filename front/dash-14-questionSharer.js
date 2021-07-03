// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

const qs = { id: 'questionSharer', o: {}, c: {} }

qs.serviceTagMap = {
  Mailchimp: '*|EMAIL|*',
  'Constant Contact': '{{ email }}',
  ConvertKit: '{{ subscriber.email_address }}',
  'Other (Gmail, Hotmail etc.)': ''
}
qs.serviceList = _.keys(qs.serviceTagMap)

// Observables & Computeds: ////////////////////////////////
qs.o.questionId = uk.observable(null)
qs.c.question = uk.computed(
  function () {
    const questionId = qs.o.questionId.get()
    if (!questionId) { return null } // short ckt.
    const question = app.o.questionMap.get()[questionId]
    if (!question) { return null } // short ckt.
    // ==> question found.
    return question
  },
  [qs.o.questionId, app.o.questionMap]
)
qs.c.generalHtmlSnippet = uk.computed(
  function () {
    const question = qs.c.question.get()
    if (!question) {
      return '' // Short ckt.
    }
    const html = uk.component('questionSharer_generalHtmlSnippet', { question: question })
    const lines = html.split('\n')
    const trimmedLines = []
    _.each(lines, function (line, i) {
      line = line.trim()
      if (line.startsWith('<!--') && line.endsWith('-->')) {
        $.noop()
      } else if (line) {
        trimmedLines.push(line)
      }
    })
    return trimmedLines.join('\n')
  },
  [qs.c.question]
)
qs.o.service = uk.observable('')
qs.c.serviceHtmlSnippet = uk.computed(
  function () {
    const service = qs.o.service()
    const genHtml = qs.c.generalHtmlSnippet()
    if (!(service && genHtml)) {
      return '' // Short ckt.
    }
    const mergeTag = qs.serviceTagMap[service]
    if (!mergeTag) {
      return genHtml // Short ckt.
    }
    return genHtml.split('?email=').join('?email=' + mergeTag)
  },
  [qs.c.generalHtmlSnippet, qs.o.service]
)

// Open: ///////////////////////////////////////////////////
qs.open = async function (info) {
  await app.questionLister.fetchQuestionListIfReqd()
  qs.o.questionId.set(info.questionId)
  if (!qs.c.question.get()) {
    app.router.openDefault()
    return null // Short ckt.
  }
}

// Events: /////////////////////////////////////////////////
qs.onClick_addChoice = async function () {
  misc.spinner.start('Adding ...')
  const { choice } = await misc.postJson('/questionCon/buildChoice', {})
  await misc.alertJson(choice)
  const liveQ = qs.o.liveQuestion.get()
  liveQ.choiceList.push(choice) // Non-observable update
  qs.o.liveQuestion.set(liveQ) // Update observably
  misc.spinner.stop()
}

qs.onSubmit_saveQuestion = async function (event) {
  const dataToSend = {
    question: qs.o.liveQuestion.get()
  }
  misc.spinner.start('Saving ...')
  const resp = await misc.postJson('/questionCon/updateQuestion', dataToSend)
  app.o.questionMap.updateOne(resp.question)
  misc.spinner.stop()
  await misc.alert('Saved!')
}

qs.close = function () {
  qs.o.questionId.set(null)
  $('#summernote_bodyArea').summernote('destroy')
}

module.exports = qs
