const Hub = require('./hub/index')
const messages = require('./messages')
const fs = require('fs')
const readline = require('readline')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const { verify } = require('./signing')
const labelValue = require('./label-value')

const adapter = new FileSync('data/db.json')
const db = low(adapter)

const messageFile = 'data/messages.txt'

db.defaults({ hubs: {} })
  .write()

class FileHub extends Hub {
  writeMessage(message) {
    fs.appendFile(messageFile, message + "\n", () => {})
  }
  getPublicKey(id) {
    const key = super.getPublicKey(id)
    if (!key) {
      // TODO check the hubs db
    }
    return key
  }
  scanHubs() {
    const inStream = fs.createReadStream(messageFile)
    const rl = readline.createInterface(inStream)
    rl.on('line', line => {
      const m = messages.parse(line)
      const { body, meta } = m
      if (body.type === 'hub-profile') {
        if (verify(m, this.getPublicKey).verified) {
          const timeValue = parseInt(labelValue.getValue(body.t))
          // only update the hub info if the timestamp of this message is newer
          const h = db.get('hubs').get(body.id).value()
          if (h && h.t >= timeValue) {
            console.log("Already have newer (or latest) record for", body.id)
          } else {
            db.get('hubs')
            .set(body.id, { id: body.id, publicKeys: body.publicKeys, geo: labelValue.getValue(body.geo), t: timeValue, message: line })
            .write()
          }
        }
      }
    })
  }
}

if (require.main === module) {
  require('dotenv').config()
  const hub = new FileHub({ hubId: process.env.HUB_ID, publicKey: process.env.HUB_PUBLIC_KEY, secretKey: process.env.HUB_SECRET_KEY })

  // const { id, keys, message } = hub.createHub({ geo: "San Francisco <9q8ywpy>" })
  // const { id, keys, message } = hub.createHub()

  // console.log("new id:", id)
  // console.log("secret key:", keys.secretKey)
  // console.log(`announce message:\n${message}`)

  hub.scanHubs()
}