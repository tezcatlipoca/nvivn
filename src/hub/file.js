const debug = require('debug')('othernet:filehub')
const Hub = require('./index')
const fs = require('fs-extra')
const split2 = require('split2')
const oyaml = require('oyaml')
const oyamlStream = require('../streams/oyaml')
const tmp = require('tmp')

class FileHub extends Hub {
  constructor(opts) {
    super(Object.assign({}, opts))
    debug("-- created filehub object --")
    this.messageFile = `data/${this.hubId}-messages.txt`
    this.profileCacheFile = `data/${this.hubId}-people.oyaml.txt`
    this.hubCacheFile = `data/${this.hubId}-hubs.oyaml.txt`
  }
  writeMessage(message) {
    fs.appendFile(this.messageFile, message + "\n", () => {})
  }

  getCacheStreams(filename) {
    fs.ensureFileSync(filename)
    const read = fs.createReadStream(filename)
    const tmpobj = tmp.fileSync()
    const tmpFile = tmpobj.name
    debug("temp file:", tmpFile)
    const write = fs.createWriteStream(tmpFile)
    // call the callback to copy temp to the new place, delete the temp file
    const callback = () => {
      return new Promise(async (resolve, reject) => {
        debug("copying", tmpFile, "to", filename)
        await fs.copy(tmpFile, filename)
        tmpobj.removeCallback()
      })
    }
    return {
      read,
      write,
      callback
    }

  }
  getHubCacheStreams() {
    return this.getCacheStreams(this.hubCacheFile)
  }
  getProfileCacheStreams() {
    return this.getCacheStreams(this.profileCacheFile)
  }
  getMessagesStream(opts) {
    fs.ensureFileSync(this.messageFile)
    return fs.createReadStream(this.messageFile).pipe(split2()).pipe(oyamlStream.parse(opts))
  }

}

module.exports = FileHub
