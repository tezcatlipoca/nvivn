const debug = process.env.DEBUG ? require('debug')('oyaml:stream') : () => {}
const oyaml = require('oyaml')
const through2 = require('through2')
const memoize = require('memoizee')

const memoizedStringify = memoize(oyaml.stringify, { primitive: true, max:10000 })
const memoizedParse = memoize(oyaml.parse, { length:2, max:10000 })

const parse = function(opts={}) {
  return through2.obj(function(chunk, enc, callback) {
    debug("start parse chunk", chunk)
    const str = chunk.toString()
    const parsed = memoizedParse(str, opts)
    debug("end parse chunk")
    debug("parsing", str, "parsed:", parsed)
    if (opts.parts) {
      const messageObj = {
        parts: oyaml.parts(str),
        data: parsed
      }
      if (opts.original) {
        messageObj.original = str
      }
      this.push(messageObj)
    } else {
      this.push(parsed)
    }
    callback()
  })
}

const stringify = function(opts={}) {
  return through2.obj(function(chunk, enc, callback) {
    if (typeof chunk === 'string') {
      this.push(chunk)
    } else {
      debug("stringify chunk", chunk, typeof chunk, "parsed", oyaml.stringify(chunk))
      const str = (opts.quoteSingleString === false && typeof chunk === 'string') ? chunk : memoizedStringify(chunk)
      this.push(str)
    }
    callback()
  })
}

module.exports = {
  parse,
  stringify
}