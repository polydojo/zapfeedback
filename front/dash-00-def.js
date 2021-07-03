// npm:
const _ = require('underscore')
const $ = require('jquery')
const bootbox = require('bootbox')

// loc:
const K = require('./constants.js')
const misc = require('./misc.js')
const underkick = require('./underkick.js')
const underkick_qsRouter = require('./underkick_qsRouter.js')

// prelims:
const uk = underkick({
  pluginList: [underkick_qsRouter],
  // "throttleWait": 0, // <-- No throttling (yet).
  // "debounceWait": 0,
  // "jsonRouter_animateCss": "animated fadeInLeft",
  listenTarget: 'body'
})

const app = {
  name: 'ZapFeedback',
  o: {},
  c: {},
  router: uk.qsRouter(),
  K: K
}

app.o.userMap = uk.observableDocMap('fname')
app.o.questionMap = uk.observableDocMap('shortName')
app.o.answerMap = uk.observableDocMap('createdAt')

app.o.currentUserId = uk.observable(null)
app.c.currentUser = uk.computed(
  function () {
    const cuid = app.o.currentUserId.get()
    if (!cuid) { return null } // Short ckt.
    const currentUser = app.o.userMap.get()[cuid]
    return currentUser || null
  },
  [app.o.userMap, app.o.currentUserId]
)

app.modalComponent = function (id, submodel, bootboxConfig) {
  bootboxConfig = bootboxConfig || {}
  return bootbox.dialog(_.extend({}, {
    message: uk.component(id, submodel),
    onEscape: true, // 'esc' key => close.
    backdrop: true, // Click outside => close.
    // ^-- (This depends on 'onEscape' being truthy. See docs for more.)
    size: null
    // ^-- That's bootbox's default. Also accepts 'small' and 'large'.
  }, bootboxConfig))
}
app.onClick_toggleDropdownByBtnId = function (ddBtnId) {
  const $ddBtn = $('#' + ddBtnId)
  _.defer(function () {
    // XXX: Can't explain the need for _.defer().
    // TODO: Investigate IFF reqd.
    $ddBtn.dropdown('toggle')
  })
}

module.exports = {
  uk, app
}
