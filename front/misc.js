const $ = require('jquery')
const _ = require('underscore')
const Cookies = require('js-cookie')
require('bootstrap') // Req'd for bootbox
const bootbox = require('bootbox')

const misc = { Cookies: Cookies }
misc.pretty = function (x, indent) {
  return JSON.stringify(x, null, indent || 4)
}

// SPINNER:
misc.spinner = (function () {
  'use strict'
  const sp = {}
  sp.$spinner = $('.spinner')
  sp.$spinnerFlash = $('.spinnerFlash')
  sp.flash = function (msg, isHtml) {
    isHtml = isHtml || false
    if (!isHtml) {
      sp.$spinnerFlash.text(msg || 'Loading ...')
    } else {
      sp.$spinnerFlash.html(msg || 'Loading ...')
    }
  }
  sp.start = function (msg, isHtml) {
    sp.flash(msg, isHtml)
    sp.$spinner.fadeIn('fast') // sp.$spinner.slideDown("fast");    // Show (slideDown => slideIn)
  }
  sp.stop = function () {
    sp.$spinner.fadeOut('fast') // sp.$spinner.slideUp("slow");      // Hide (slideUp => slideOut)
  }
  sp.stopWith = function (msg, timeMS) {
    timeMS = timeMS || 1500
    sp.start(msg)
    window.setTimeout(function () {
      sp.stop()
    }, timeMS)
  }
  return sp
}())

// Bootbox Related: ::::::::::::::::::::::::::::::::::::::::
misc.rawBootboxPromise = function (funcName, x) {
  if (_.isString(x)) {
    // return new Promise(resolve => bootbox[funcName](x, resolve));                                 // <-- One line version
    return new Promise(function (resolve, reject) {
      bootbox[funcName](x, resolve)
    })
  } else if ($.isPlainObject(x) && !_.has(x, 'callback')) {
    // return new Promise(resolve => bootbox[funcName](_.extend({}, x, {"callback": resolve})));    // <-- One line version
    return new Promise(function (resolve, reject) {
      const xWithCb = _.extend({}, x, { callback: resolve })
      // ^-- Using _.extend({}, ...) to ensure non-aliasing.
      // console.log("xWithCb ="); console.log(xWithCb);
      bootbox[funcName](xWithCb)
    })
  } else {
    console.log(x)
    throw new Error("misc.rawBootboxPromise: Expected string or object without 'callback' property, not " + x)
  }
}
//
misc.alertRaw = x => misc.rawBootboxPromise('alert', x)
misc.promptRaw = x => misc.rawBootboxPromise('prompt', x)
misc.confirmRaw = x => misc.rawBootboxPromise('confirm', x)
//
misc.alertText = s => misc.alertRaw("<span class='preWrap'>" + _.escape(s) + '</span>') // Note: .preWrap is def'nd in helpers.css
misc.alertJson = x => misc.alertRaw('<pre>' + _.escape(misc.pretty(x)) + '</pre>')
misc.promptText = s => misc.promptRaw("<span class='preWrap'>" + _.escape(s) + '</span>')
misc.confirmText = s => misc.confirmRaw("<span class='preWrap'>" + _.escape(s) + '</span>')
//
misc.alert = misc.alertText // Alias, short w/ safe default.
misc.prompt = misc.promptText // Alias, short w/ safe default.
misc.confirm = misc.confirmText // Alias, short w/ safe default.

// AJAX Posting:
misc.postJson = async function (url, data, success) {
  if (!_.isString(data)) { data = JSON.stringify(data) }
  const ajaxOpt = {
    type: 'POST',
    url: url,
    data: data,
    success: success,
    dataType: 'json',
    contentType: 'application/json',
    headers: {
      'X-Csrf-Token': Cookies.get('xCsrfToken') || ''
    }
  }
  // console.log(ajaxOpt);
  return $.ajax(ajaxOpt)
}

// Error Handlign
$(document).ajaxError(async function (event, jqXhr) {
  window.jqXhr = jqXhr
  // console.log(jqXhr.responseText);
  // console.trace();
  misc.spinner.stop()
  if (jqXhr.status === 418 && jqXhr.responseJSON && jqXhr.responseJSON.status === 'fail') {
    // ==> 418 JSON Error
    const reason = jqXhr.responseJSON.reason
    if (reason.toLowerCase().split(' ').join('').includes('logout')) {
      // ==> Force logout
      await misc.alert('Error: ' + reason)
      window.location.href = '/logout'
    } else {
      // ==> Needn't force logout.
      misc.alert('Error: ' + reason)
    }
  } else if (jqXhr.status === 0) {
    misc.alert('Network error, please check your Internet connection and retry.')
  } else {
    // Unknown error:
    misc.alert('An unknown error occured. | Status Code: ' + jqXhr.status)
  }
})

// Break out of iframes:
misc.frameBreak = function () {
  'use strict'
  // Ref. https://css-tricks.com/snippets/javascript/break-out-of-iframe/
  if (window.location !== window.top.location) {
    // Later try:
    _.delay(function () {
      $('html').html('FRAME ERROR: Please contact support@polydojo.com.')
    }, 100)
    // First try:
    window.top.location = window.location // <-- If browser blocks top-nav, then delayed 'FRAME ERROR' msg shown.
  }
}

module.exports = misc
window.misc = misc
