const debug = process.env.DEBUG ? require('debug')('filter:stream') : () => {}
const through2 = require('through2')
const mingo = require('mingo')

module.exports = function(q) {
  const mingoQuery = new mingo.Query(q)
  return through2.obj(function(chunk, enc, callback) {
    debug("matches?", mingoQuery.test(chunk), "filtering", chunk, "with", q)
    if (mingoQuery.test(chunk)) this.push(chunk)
    callback()
  })
}
