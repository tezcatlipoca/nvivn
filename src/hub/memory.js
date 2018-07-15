const debug = require('debug')('othernet:memoryhub')
const Hub = require('./index')
const split2 = require('split2')
const oyaml = require('oyaml')
const oyamlStream = require('../streams/oyaml')
const { Readable } = require('stream')
const memStreams = require('memory-streams')

const readStreamFromString = function(str) {
  const inStream = new Readable({
    read() {}
  });
  inStream.push(str)
  inStream.push(null)
  return inStream
}

class MemoryHub extends Hub {
  constructor(opts={}) {
    super(Object.assign({}, opts))
    this.messages = opts.messages || ''
    this.profileCache = ''
    this.hubCache = ''
  }
  writeMessage(message) {
    this.messages += message + "\n"
  }

  getCacheStreams(source) {
    debug("getting cache streams for", source)
    const read = readStreamFromString(this[source])
    const write = new memStreams.WritableStream()
    // call the callback to copy the new value to the original variable
    const callback = () => {
      return new Promise(async (resolve, reject) => {
        debug("setting new value for", source, write.toString())
        this[source] = write.toString()
      })
    }
    return {
      read,
      write,
      callback
    }

  }
  getHubCacheStreams() {
    return this.getCacheStreams('hubCache')
  }
  getProfileCacheStreams() {
    return this.getCacheStreams('profileCache')
  }
  getMessagesStream(opts) {
    return readStreamFromString(this.messages).pipe(split2()).pipe(oyamlStream.parse(opts))
  }

}

module.exports = MemoryHub
