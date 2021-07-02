const $ = require('jquery')
// const _ = require('underscore')
const misc = require('./misc.js')

$(function () { misc.spinner.stop() })

$('form.setupr').on('submit', async function (event) {
  event.preventDefault()
  const form = event.currentTarget
  if (form.pw.value !== form.repeatPw.value) {
    misc.alert("Passwords don't match.")
    return null
  }
  const dataToSend = {
    fname: form.fname.value,
    lname: form.lname.value,
    email: form.email.value,
    pw: form.pw.value
  }
  // console.log(dataToSend);
  misc.spinner.start('Setting up ...')
  await misc.postJson('/userCon/setupFirstUser', dataToSend)
  misc.spinner.stop()
  await misc.alert('Setup complete. Please log in.')
  misc.spinner.start('Redirecting ...')
  window.location.href = '/login'
})
