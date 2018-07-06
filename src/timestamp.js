const { encode, getValue } = require('./label-value')

const format = function(time) {
  const label = time.toISOString().split('T')[0]
  return encode({ label, value: Math.round(time.getTime() / 1000) })
}

const parse = function(timeString, opts={}) {
  let value = getValue(timeString)
  if (value && value.match(/^\d{9,}$/)) {
    value = parseInt(value)
    if (opts.raw) return value
    value *= 1000
  }
  return opts.raw ? value : new Date(value)
}

const now = function() {
  return format(new Date())
}

module.exports = {
  format,
  parse,
  now
}