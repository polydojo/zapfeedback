const _ = require('underscore')
const $ = require('jquery')
const misc = require('./misc.js')

misc.spinner.stop()

$('#thanksForm').on('submit', function (event) {
  event.preventDefault()
  misc.alert("Commenting functionality hasn't yet been implemented.")
})
