const debug = require('debug')('othernet:filters')
const mingo = require('mingo')
const datemath = require('datemath-parser').parse
const parseDate = require('./timestamp').parse
const { getValue } = require('./label-value')
const oyaml = require('oyaml')
const Query = mingo.Query || mingo.default.Query

const allowAll = {
  test: () => true
}

const customFunctions = { value: getValue, datemath, date: parseDate }

module.exports = function(filter) {
  debug("building filter:", filter)
  let { body, meta } = filter
  let bodyQuery = (body || filter)
  if (!body) {
    meta = bodyQuery.meta
    delete bodyQuery.meta
  }
  if (Object.keys(bodyQuery).length === 0) bodyQuery = null
  debug("body query", bodyQuery)
  const bodyFilter = bodyQuery ? new Query(bodyQuery) : allowAll
  const metaFilter = meta ? new Query(meta) : allowAll
  return ({ body, meta }) => {
    if (bodyQuery && bodyQuery.t && body.t) body = Object.assign({}, body, { t: parseInt(getValue(body.t)), 't.raw': body.t })
    // if (bodyQuery.t) debug(body.t, body['t.raw'])
    // debug("passed body filter?", bodyFilter.test(body))
    // debug("passed meta filter?", metaFilter.test(meta))
    return bodyFilter.test(body) && metaFilter.test(meta)
  }
}
