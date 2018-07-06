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
    this.messageFile = 'data/messages.txt'
    this.hubProfileFile = 'data/people.txt'
  }
  writeMessage(message) {
    fs.appendFile(this.messageFile, message + "\n", () => {})
  }
  writeProfile(profile) {
    fs.appendFile(this.hubProfileFile, profile + "\n", () => {})
  }
  lastProfileSync() {
    return readLastLines.read(this.hubProfileFile, 1)
      .then(line => {
        const lastLine = oyaml.parse(line)
        return lastLine.seen
      })
  }
  async scanMessages(lineFn) {
    const inStream = fs.createReadStream(this.messageFile)
    const rl = readline.createInterface(inStream)
    rl.on('line', line => {
      const m = messages.parse(line)
      lineFn(m)
    })
    return new Promise(({ resolve, reject }) => {
      rl.on('end', () => resolve())
    })
  }
}

module.exports = FileHub