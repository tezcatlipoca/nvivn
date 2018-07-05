const { encode, getValue } = require('./label-value')

const format = function(time) {
  const label = time.toISOString().split('T')[0]
  return encode({ label, value: Math.round(time.getTime() / 1000) })
}

const parse = function(timeString) {
  const value = getValue(timeString)
  return new Date(value * 1000)
}

const now = function() {
  return format(new Date())
}

module.exports = {
  format,
  parse,
  now
}