const $ = require('jquery')
const _ = require('underscore')
// var DOMPurify = require("dompurify")["default"](window);
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

const QS = makeshift_parseQs()
window.QS = QS

const fetchInvitee = async function () {
  const dataToSend = {
    userId: QS.inviteeId,
    veriCode: QS.veriCode
  }
  const resp = await misc.postJson('/userCon/fetchInvitedUserByVeriCode', dataToSend)
  window.user = resp.user
  return resp.user
}

$('form.joinr').on('submit', async function (event) {
  event.preventDefault()
  const form = event.currentTarget
  const dataToSend = {
    fname: form.fname.value,
    lname: form.lname.value,
    email: form.email.value,
    userId: form.userId.value,
    veriCode: form.veriCode.value
  }
  console.log(dataToSend)
  misc.spinner.start('Joining ...')
  await misc.postJson('/userCon/acceptInvite', dataToSend)
  misc.spinner.flash('Redirecting ...')
  window.location.href = '/dash'
})

$(async function () {
  const invitee = await fetchInvitee()
  const form = $('form.joinr')[0]
  form.fname.value = invitee.fname
  form.lname.value = invitee.lname
  form.email.value = invitee.email
  form.userId.value = invitee._id
  form.veriCode.value = QS.veriCode
  misc.spinner.stop()
})
