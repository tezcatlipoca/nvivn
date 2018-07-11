const debug = require('debug')('othernet:filehub')
const Hub = require('./index')
const fs = require('fs-extra')
const split2 = require('split2')
const through2 = require('through2')
const FileSync = require('lowdb/adapters/FileSync')
const readLastLines = require('read-last-lines')
const backwardsStream = require('fs-reverse')
const oyaml = require('oyaml')
const oyamlStream = require('../streams/oyaml')
const tmp = require('tmp')
require('colors')

class FileHub extends Hub {
  constructor(opts) {
    super(Object.assign({}, opts, { adapter: new FileSync('data/db.json') }))
    debug("-- created filehub object --")
    this.messageFile = `data/${this.hubId}-messages.txt`
    this.hubProfileFile = `data/${this.hubId}-people.oyaml.txt`
    this.hubCacheFile = `data/${this.hubId}-hubs.oyaml.txt`
  }
  writeMessage(message) {
    fs.appendFile(this.messageFile, message + "\n", () => {})
  }
  writeProfile(profile) {
    fs.appendFile(this.hubProfileFile, profile + "\n", () => {})
  }
  // lastProfileSync() {
  //   if (!fs.existsSync(this.hubProfileFile)) return 0
  //   return readLastLines.read(this.hubProfileFile, 1)
  //     .then(line => {
  //       if (line.trim() === '') return 0
  //       const lastLine = oyaml.parse(line)
  //       return lastLine.seen
  //     })
  // }

  // pass the id in case it's used for partitioning
  getProfileStream(id) {
    return backwardsStream(this.hubProfileFile).pipe(oyamlStream.parse())
  }
  getHubCacheStreams() {
    const read = fs.createReadStream(this.hubCacheFile)
    const tmpobj = tmp.fileSync()
    const tmpFile = tmpobj.name
    // const tmpFile = 'tmp.txt'
    debug("temp file:", tmpFile)
    const write = fs.createWriteStream(tmpFile)
    // debug("write stream:", write)
    // call the callback to copy temp to the new place, delete the temp file
    const callback = () => {
      return new Promise(async (resolve, reject) => {
        debug("copying", tmpFile, "to", this.hubCacheFile)
        await fs.copy(tmpFile, this.hubCacheFile)
        tmpobj.removeCallback()
      })
    }
    return {
      read,
      write,
      callback
    }
  }
  getMessagesStream(opts) {
    return fs.createReadStream(this.messageFile).pipe(split2()).pipe(oyamlStream.parse(opts))
  }
  // getProfile(id) {
  //   debug("looking up profile", id)
  //   if (!fs.existsSync(this.hubProfileFile)) return false
  //   return new Promise(resolve => {
  //     let result
  //     this.scanLines(this.hubProfileFile, (line, done) => {
  //       // debug("read line", line)
  //       try {
  //         oyaml.parse(line)
  //       } catch (err) {
  //         console.error("!!!! died parsing", line)
  //         console.error(err)
  //       }
  //       if (line.includes(`id:${id}`)) {
  //         const profile = oyaml.parse(line)
  //         result = profile
  //         done() // close the stream
  //       }
  //     }, { reverse: true }).then(() => {
  //       debug("returning result", result)
  //       resolve(result)
  //     })
  //   })
  // }
  // scanLines(filepath, lineFn, opts={}) {
  //   const inStream = opts.reverse ? backwardsStream(filepath) : fs.createReadStream(filepath).pipe(split2())
  //   const done = () => {
  //     debug("-- destroying the stream, done early --")
  //     inStream.destroy()
  //   }
  //   inStream.pipe(through2(async function(line, encoding, callback) {
  //     await lineFn(line.toString(), done)
  //     callback()
  //   }))
  //   return new Promise(resolve => {
  //     inStream.on('close', () => {
  //       debug("stream closed")
  //       resolve()
  //     })
  //   })
  // }
}

module.exports = FileHub