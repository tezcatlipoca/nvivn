const debug = require('debug')('othernet:filters')
const mingo = require('mingo')
const datemath = require('datemath-parser').parse
const parseDate = require('./timestamp').parse
const { getValue } = require('./label-value')
const oyaml = require('oyaml')

const allowAll = {
  test: () => true
}

const customFunctions = { value: getValue, datemath, date: parseDate }

module.exports = function(filterString) {
  debug("filter string", filterString)
  const parsedFilterString = typeof filterString === 'object' ? filterString : oyaml.parse(filterString)
  const { body, meta, notRouted } = parsedFilterString
  const bodyQuery = (body || parsedFilterString)
  debug("body query", bodyQuery)
  const metaQuery = meta && oyaml.parse(meta)
  const bodyFilter = bodyQuery ? new mingo.Query(bodyQuery) : allowAll
  const metaFilter = meta ? new mingo.Query(metaQuery) : allowAll
  return ({ body, meta }) => {
    if (bodyQuery.t && body.t) body = Object.assign({}, body, { t: parseInt(getValue(body.t)), 't.raw': body.t })
    // if (bodyQuery.t) debug(body.t, body['t.raw'])
    if (notRouted) {
      return !meta || !meta.route || !meta.route.find(r => r.id === notRouted)
    }
    return bodyFilter.test(body) && metaFilter.test(meta)
  }
}