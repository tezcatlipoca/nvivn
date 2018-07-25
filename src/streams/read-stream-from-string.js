const { Readable } = require('stream')

module.exports = function(str) {
  const inStream = new Readable({
    read() {}
  });
  inStream.push(str)
  inStream.push(null)
  return inStream
}
