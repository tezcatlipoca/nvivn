const oyaml = require('oyaml')

const parse = function(messageString, opts={}) {
  const result = {}
  const [body, meta] = oyaml.parts(messageString)
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
  let parts = [body]
  if (meta) parts.push(meta)
  return typeof body === 'string' ? body : oyaml.stringify(parts)
}

module.exports = {
  parse,
  stringify
}