const oyaml = require('oyaml')

const parse = function(messageString, opts={}) {
  const result = {}
  const [body, meta] = messageString.split("|").map(s => s && s.trim())
  result.rawBody = body
  if (opts.parseBody !== false) result.body = oyaml.parse(body)
  if (meta) {
    result.rawMeta = meta
    if (opts.parseMeta !== false) result.meta = oyaml.parse(meta)
  }
  return result
}

const stringify = function({ body, meta }) {
  if (!body) throw new Error("Must provide body")
  return `${typeof body === 'string' ? body : oyaml.stringify(body)} | ${oyaml.stringify(meta)}`
}

module.exports = {
  parse,
  stringify
}