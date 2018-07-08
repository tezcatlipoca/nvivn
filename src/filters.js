const mingo = require('mingo')
const datemath = require('datemath-parser').parse
const parseDate = require('./timestamp').parse
const { getValue } = require('./label-value')
const oyaml = require('oyaml')

const allowAll = {
  test: () => true
}

const customFunctions = { value: getValue, datemath, date: parseDate }

module.exports = function({ body, meta, notRouted }) {
  const bodyQuery = oyaml.parse(body)
  const metaQuery = meta && oyaml.parse(meta)
  const bodyFilter = body ? new mingo.Query(bodyQuery) : allowAll
  const metaFilter = meta ? new mingo.Query(metaQuery) : allowAll
  return ({ body, meta }) => {
    if (bodyQuery.t && body.t) body = Object.assign({}, body, { t: parseInt(getValue(body.t)), 't.raw': body.t })
    if (notRouted) {
      return !meta || !meta.route || !meta.route.find(r => r.id === notRouted)
    }
    return bodyFilter.test(body) && metaFilter.test(meta)
  }
}