const $ = require('jquery')
// const _ = require('underscore')
const misc = require('./misc.js')
// const K = require('./constants.js')

$(function () {
  misc.spinner.stop()
  // TODO-the-following:
  /*
    _.each($(".ghRepoUrl"), function (el) {                 // <-- TODO: Set .ghRepoUrl's href not only for login.html, but others too.
        el.href = K.GH_REPO_URL;
        el.target = "_blank";
    });
    */
})

// Old login form w/ password:
$('form.withPw').on('submit', async function (event) {
  event.preventDefault()
  const form = event.currentTarget
  const dataToSend = {
    email: form.email.value,
    pw: form.pw.value
  }
  misc.alertJson(dataToSend)
  // pugmark:login-urlid
  console.log(dataToSend)
  misc.spinner.start('Logging in ...')
  await misc.postJson('/userCon/loginDo', dataToSend)
  misc.spinner.flash('Redirecting ...')
  window.location.href = '/dash'
})

// New passwordless login form:
$('form.pwLess').on('submit', async function (event) {
  event.preventDefault()
  const form = event.currentTarget
  const dataToSend = { email: form.email.value }
  misc.spinner.start('Processing ...')
  await misc.postJson('/userCon/startMagiLogin', dataToSend)
  misc.spinner.stop()
  await misc.alert('A fresh Login Link has been emailed to you. Please click it to log in.')
})
