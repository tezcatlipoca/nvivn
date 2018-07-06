const { encode, getValue } = require('./label-value')

const format = function(time) {
  const label = time.toISOString().split('T')[0]
  return encode({ label, value: Math.round(time.getTime() / 1000) })
}

const parse = function(timeString) {
  let value = getValue(timeString)
  if (value && value.match(/^\d{9,}$/)) value = parseInt(value) * 1000
  return new Date(value)
}

const now = function() {
  return format(new Date())
}

module.exports = {
  format,
  parse,
  now
}