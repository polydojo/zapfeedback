const _ = require('underscore')
const $ = require('jquery')
const misc = require('./misc.js')

const hitLogout = async function () {
  misc.spinner.flash('Logging out ...')
  await misc.postJson('/userCon/logout', {})
  $('#logout_main').show()
  misc.spinner.stop()
}
hitLogout()
