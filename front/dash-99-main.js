// npm:
const _ = require('underscore')
const $ = require('jquery')
const bootbox = require('bootbox')
// const __bootstrap = require('bootstrap')
// const __popper = require("popper.js")["default"];

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

app.questionLister = require('./dash-10-questionLister.js')
app.questionEditor = require('./dash-12-questionEditor.js')
app.questionSharer = require('./dash-14-questionSharer.js')
app.answerLister = require('./dash-16-answerLister.js')
app.userLister = require('./dash-30-userLister.js')
// pugmark:dash-moreq

app.detectLogin = async function () {
  const resp = await misc.postJson('/userCon/detectLogin', {})
  if (!(resp && resp.user && resp.user._id)) {
    window.location.href = '/login'
    return null
  }
  // ==> Detection succeeded.
  app.o.userMap.updateOne(resp.user)
  app.o.currentUserId.set(resp.user._id)
  // pugmark:dash-dctlogmo
  misc.spinner.stop()
  return null
}

$.extend(window, { $, _, uk, app, bootbox }) // Pre-tpl-rendering.

$(async function () {
  await app.detectLogin()
  uk.render(app, 'ukSource', 'ukTarget', 'model')
  app.router.autoRegister(app) // Post-first-render
  app.router.trigger()
})
