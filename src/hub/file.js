const Hub = require('./index')
const messages = require('../messages')
const fs = require('fs')
const readline = require('readline')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const { verify } = require('../signing')
const labelValue = require('../label-value')

class FileHub extends Hub {
  constructor(opts) {
    super(opts)
    const adapter = new FileSync('data/db.json')
    this.db = low(adapter)
    
    this.messageFile = 'data/messages.txt'
    
    this.db.defaults({ hubs: {} })
      .write()  
  }
  writeMessage(message) {
    fs.appendFile(this.messageFile, message + "\n", () => {})
  }
  getPublicKeys(id) {
    const keys = super.getPublicKeys(id)
    if (!keys) {
      return this.db.get('hubs').get(id).value().publicKeys
    }
    return keys
  }
  scanHubs() {
    const inStream = fs.createReadStream(this.messageFile)
    const rl = readline.createInterface(inStream)
    rl.on('line', line => {
      const m = messages.parse(line)
      const { body, meta } = m
      if (body.type === 'hub-profile') {
        if (verify(m, this.getPublicKeys).verified) {
          const timeValue = parseInt(labelValue.getValue(body.t))
          // only update the hub info if the timestamp of this message is newer
          const h = this.db.get('hubs').get(body.id).value()
          if (h && h.t >= timeValue) {
            console.log("Already have newer (or latest) record for", body.id)
          } else {
            const hubData = { id: body.id, publicKeys: body.publicKeys, t: timeValue, message: line }
            if (body.geo) hubData.geo = labelValue.getValue(body.geo)
            this.db.get('hubs')
            .set(body.id, hubData)
            .write()
          }
        }
      }
    })
  }
}

module.exports = FileHub