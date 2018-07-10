const through2 = require('through2')

module.exports = function() {
  return through2.obj(function(chunk, enc, callback) {
    this.push(chunk)
    this.push("\n")
    callback()
  })
}
