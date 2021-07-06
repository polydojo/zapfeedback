// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

const qs = { id: 'questionSharer', o: {}, c: {} }

qs.serviceTagMap = {
  ActiveCampaign: '%EMAIL%',
  // https://help.activecampaign.com/hc/en-us/articles/220709307-Personalization-Tags

  Autopilot: '--Email--',
  // https://support.autopilothq.com/hc/en-us/articles/204376055-Add-personalization-variables

  AWeber: '{!email}',
  // https://help.aweber.com/hc/en-us/articles/204029906-What-can-I-personalize-in-my-messages-

  Benchmark: '[address_block]',
  // https://kb.benchmarkemail.com/en/merge-tags-available-in-benchmark-email/amp/

  'Campaign Monitor': '[email]',
  // https://help.campaignmonitor.com/personalize-emails-with-subscriber-custom-fields

  'Constant Contact': '{{ email }}',
  // https://knowledgebase.constantcontact.com/articles/KnowledgeBase/pro-39884-Merge-Tag-Overview-All-Tags-How-To-Use-Them?lang=en_US

  ConvertKit: '{{ subscriber.email_address }}',
  // https://help.convertkit.com/en/articles/2502633-basic-email-personalization-with-liquid-faqs

  'Customer.io': '{{customer.email}}',
  // https://customer.io/docs/using-liquid/

  Drip: '{{ subscriber.email }}',
  // https://www.drip.com/learn/docs/manual/liquid/objects

  'Mad Mimi': '(email)',
  // https://help.madmimi.com/do-you-support-personalization-tags-e-g-dear-first_name/

  Mailchimp: '*|EMAIL|*',
  // https://mailchimp.com/help/all-the-merge-tags-cheat-sheet/

  MailerLite: '{$email}',
  // http://help.mailerlite.com/article/show/29194-what-custom-variables-can-i-use-in-my-campaigns

  EmailOctopus: '{{EmailAddress}} ',
  // https://help.emailoctopus.com/article/74-customisation-cheat-sheet

  GetResponse: '[[email]]',
  // https://www.getresponse.com/help/how-can-i-personalize-my-emails.html

  Klaviyo: '{{ email }}',
  // https://help.klaviyo.com/hc/en-us/articles/115005084927-Template-Tags-and-Variable-Syntax

  Vero: '{{user.email}} ',
  // https://help.getvero.com/articles/inserting-merge-tags-using-liquid-in-my-emails/

  'Website/Blog': '',
  'Other (Gmail, Hotmail, etc.)': ''
}
qs.serviceList = _.keys(qs.serviceTagMap)

// Observables: ////////////////////////////////////////////
qs.o.questionId = uk.observable(null)
qs.o.service = uk.observable('')

// Computeds: //////////////////////////////////////////////
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

// Close: //////////////////////////////////////////////////
qs.close = function () {
  qs.o.questionId.set(null)
  qs.o.service.set('')
}

module.exports = qs
