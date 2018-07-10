const debug = process.env.DEBUG ? require('debug')('oyaml:stream') : () => {}
const oyaml = require('oyaml')
const through2 = require('through2')

const parse = function(opts={}) {
  return through2.obj(function(chunk, enc, callback) {
    debug("parse chunk", chunk)
    const str = chunk.toString()
    const parsed = oyaml.parse(str, opts)
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
    debug("stringify chunk", chunk, typeof chunk, "parsed", oyaml.stringify(chunk))
    const str = (opts.quoteSingleString === false && typeof chunk === 'string') ? chunk : oyaml.stringify(chunk)
    this.push(str)
    callback()
  })
}

module.exports = {
  parse,
  stringify
}