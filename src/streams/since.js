const debug = process.env.DEBUG ? require('debug')('filter:since') : () => {}
const datemath = require('datemath-parser').parse
const labelValue = require('../label-value')
const through2 = require('through2')

module.exports = function(since, hubId, extractor, opts={}) {
  if (!extractor) extractor = obj => obj

  if (typeof since === 'string') {
    since = Math.floor(datemath(since) / 1000)
    debug("since is now", since)
  }

  return through2.obj(function(message, enc, callback) {
    debug("handling message", extractor(message))
    const meta = extractor(message)[1]
    const thisHubRoute = meta && meta.route.find(r => r.id === hubId)
    const seen = thisHubRoute && parseInt(labelValue.getValue(thisHubRoute.t))
    if (seen > since) {
      if (opts.saveSeen) {
        this.push(Object.assign({}, message, { seen }))
      } else {
        this.push(message)
      }
    }
    callback()
  })
}
