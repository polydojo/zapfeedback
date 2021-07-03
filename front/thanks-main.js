const _ = require('underscore')
const $ = require('jquery')
const misc = require('./misc.js')

const makeshift_parseQs = function (qs, shouldTrim) {
  // Makeshift helper, from uk's parseQs.
  qs = qs || window.location.search.slice(1)
  shouldTrim = shouldTrim || false
  const pairRe = /[^=&]+\=[^=&]+/g // Something of the form "foo=bar"
  const info = {}
  _.each(qs.match(pairRe), function (pair) {
    const kv = _.map(pair.split('='), decodeURIComponent)
    if (shouldTrim) {
      kv[0] = kv[0].trim()
      kv[1] = kv[1].trim()
    }
    info[kv[0]] = kv[1]
  })
  return info
}

const qdata = makeshift_parseQs()
window.qdata = qdata

if (qdata.askEmail === 'True') { // String cmp w/ "True"
  $('#step0_askEmail').show()
} else {
  $('#step1_askComment').show()
}
misc.spinner.stop()

$('#askEmailForm').on('submit', async function (event) {
  event.preventDefault()
  const email = event.currentTarget.email.value.trim()
  const dataToSend = {
    answerId: qdata.answerId,
    prop: 'email',
    email: email
  }
  misc.spinner.start('Processing ...')
  await misc.postJson('/answerCon/supplyProp', dataToSend)
  $('#step0_askEmail').hide()
  $('#step1_askComment').show()
  misc.spinner.stop()
})

$('#askCommentForm').on('submit', async function (event) {
  event.preventDefault()
  const comment = event.currentTarget.comment.value.trim()
  const dataToSend = {
    answerId: qdata.answerId,
    prop: 'comment',
    comment: comment
  }
  misc.spinner.start('Processing ...')
  await misc.postJson('/answerCon/supplyProp', dataToSend)
  $('#step1_askComment').hide()
  $('#step2_bye').show()
  misc.spinner.stop()
})
