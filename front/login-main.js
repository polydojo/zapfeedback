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

$('form.loginr').on('submit', async function (event) {
  event.preventDefault()
  const form = event.currentTarget
  const dataToSend = {
    email: form.email.value,
    pw: form.pw.value
  }
  // pugmark:login-urlid
  console.log(dataToSend)
  misc.spinner.start('Logging in ...')
  await misc.postJson('/userCon/loginDo', dataToSend)
  misc.spinner.flash('Redirecting ...')
  window.location.href = '/dash'
})
