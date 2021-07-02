// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

// RouteApp:
const ul = { id: 'userLister', o: {}, c: {} }

// Observables & Computeds:
ul.o.isInviteFormVisible = uk.observableBool(false)
ul.c.userList = app.o.userMap.list // Alias, snap-friendly.

// Open:
ul.open = function () {
  ul.fetchUserListIfReqd()
}
ul.fetchUserListIfReqd = async function () {
  if (app.o.userMap.isFetched.get()) {
    // ==> Already fetched.
    return app.o.userMap.list()
  }
  // ==> Not yet fetched.
  return await ul.fetchUserList()
}
ul.fetchUserList = async function () {
  misc.spinner.start('Fetching Users ...')
  const fulResp = await misc.postJson('/userCon/fetchUserList', {})
  // misc.alertJson(fulResp);
  app.o.userMap.updateMany(fulResp.userList)
  app.o.userMap.isFetched.set(true)
  misc.spinner.stop()
  return fulResp.userList
}

// Inviting:
ul.onClick_toggleInviteForm = function () {
  ul.o.isInviteFormVisible.toggle()
}
ul.onSubmit_inviteForm = async function (event) {
  const formEl = event.target
  window.formEl = formEl; console.log(formEl)
  await ul.sendInvite(
    formEl.fname.value,
    formEl.lname.value,
    formEl.email.value,
    formEl.isAdmin.value === 'on'
  )
  formEl.reset()
}
ul.sendInvite = async function (fname, lname, email, isAdmin) {
  // Helper, for re/inviting a user.
  const dataToSend = {
    invitee_fname: fname,
    invitee_lname: lname,
    invitee_email: email.trim().toLowerCase(), // Normalized email, lowercase + trimmed.
    invitee_isAdmin: isAdmin
  }
  misc.spinner.start('Processing ...')
  const resp = await misc.postJson('/userCon/inviteUser', dataToSend)
  app.o.userMap.updateOne(resp.user)
  misc.spinner.stop()
  if (resp.inviteLink) {
    await misc.alert('Done! Joining link: ' + resp.inviteLink)
  } else {
    await misc.alert('Done! Invitation email sent.')
  }
}
ul.onClick_reinvite = async function (thatUserId) {
  const thatUser = app.o.userMap.get()[thatUserId]
  await ul.sendInvite(
    thatUser.fname, thatUser.lname,
    thatUser.email, thatUser.isAdmin
  )
}

// Re/Deactivating:
ul.onClick_toggle_isDeactivated = async function (thatUserId) {
  const thatUser = app.o.userMap.get()[thatUserId]
  console.assert(thatUser, 'Assert `thatUser` exists.')
  const dataToSend = {
    thatUserId: thatUser._id,
    preToggle_isDeactivated: thatUser.isDeactivated // <-- To prevent accidental oppsite toggle.
  }
  const z = thatUser.isDeactivated ? 'r' : 'd' // CLI only. Helps flash spinner msg.
  misc.spinner.start(z.toUpperCase() + 'eactivating ...') // Flash 'Deactivating ...' or 'Reactivating ...'
  const resp = await misc.postJson('/userCon/toggleUser_isDeactivated', dataToSend)
  app.o.userMap.updateOne(resp.user)
  misc.spinner.stop()
  await misc.alert('Done! User account ' + z + 'eactivated.')
}

// Close:
ul.close = function () {
  ul.o.isInviteFormVisible.set(false)
}

// Export:
module.exports = ul
