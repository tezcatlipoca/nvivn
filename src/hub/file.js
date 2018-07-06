const Hub = require('./index')
const messages = require('../messages')
const fs = require('fs')
const readline = require('readline')
const FileSync = require('lowdb/adapters/FileSync')
const readLastLines = require('read-last-lines')
const oyaml = require('oyaml')

class FileHub extends Hub {
  constructor(opts) {
    super(Object.assign({}, opts, { adapter: new FileSync('data/db.json') }))
    this.messageFile = `data/${this.hubId}-messages.txt`
    this.hubProfileFile = `data/${this.hubId}-people.txt`
  }
  writeMessage(message) {
    fs.appendFile(this.messageFile, message + "\n", () => {})
  }
  writeProfile(profile) {
    fs.appendFile(this.hubProfileFile, profile + "\n", () => {})
  }
  lastProfileSync() {
    if (!fs.existsSync(this.hubProfileFile)) return 0
    return readLastLines.read(this.hubProfileFile, 1)
      .then(line => {
        if (line.trim() === '') return 0
        const lastLine = oyaml.parse(line)
        return lastLine.seen
      })
  }
  profileExists(id) {
    return new Promise(resolve => {
      this.scanLines(this.hubProfileFile, line => {
        if (line.includes(`id:${id}`)) resolve(true)
      }).then(() => resolve(false))
    })
  }
  scanLines(filepath, lineFn) {
    const inStream = fs.createReadStream(filepath)
    const rl = readline.createInterface(inStream)
    rl.on('line', lineFn)
    return new Promise(resolve => {
      rl.on('close', () => resolve())
    })
  }
  scanMessages(lineFn) {
    return this.scanLines(this.messageFile, line => {
      const m = messages.parse(line)
      lineFn(m)
    })
  }
}

module.exports = FileHub