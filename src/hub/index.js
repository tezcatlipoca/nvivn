const proquint = require('proquint')
const crypto = require('crypto')
const bs58 = require('bs58')
const signatures = require('sodium-signatures')
const timestamp = require('../timestamp')
const { sign, verify } = require('../signing')
const messages = require('../messages')

class Hub {
  constructor(config) {
    if (!config || !config.hubId || !config.publicKey || !config.secretKey) {
      throw new Error("Must provide hubId, publicKey, and secretKey")
    }
    this.config = config
    this.hubId = config.hubId
    this.hubIdBuffer = proquint.decode(config.hubId)
    this.getPublicKey = this.getPublicKey.bind(this)
  }

  getPublicKey(id) {
    return id === this.config.hubId ? this.config.publicKey : null
  }

  createPerson(opts={}) {
    return this.createProfile(Buffer.concat([crypto.randomBytes(4), this.hubIdBuffer]), opts)
  }

  createHub(opts={}) {
    return this.createProfile(crypto.randomBytes(2), opts)
  }

  createProfile(idBuffer, opts={}) {
    const id = proquint.encode(idBuffer)
  
    const keyPair = signatures.keyPair()
    const keys = {
      secretKey: bs58.encode(keyPair.secretKey),
      publicKey: bs58.encode(keyPair.publicKey)
    }
  
    const t = timestamp.now()
    const announceMessage = Object.assign({t, id}, opts, { from:this.hubId, type:'profile', t, id, publicKeys:[keys.publicKey] })
    const meta = {
      route: [{ id: this.hubId, t: timestamp.now()}],
      signed: [
        { id: this.hubId, signature: sign(announceMessage, this.config.secretKey) }
      ]
    }
    return {
      id,
      keys,
      message: messages.stringify({ body: announceMessage, meta})
    }
  }

  verifyMessage(message) {
    return verify(message, this.getPublicKey)
  }

}

if (require.main === module) {
  require('dotenv').config()
  const hub = new Hub({ hubId: process.env.HUB_ID, publicKey: process.env.HUB_PUBLIC_KEY, secretKey: process.env.HUB_SECRET_KEY })
  const { id, keys, message } = hub.createHub({ geo: "San Francisco <9q8ywpy>" })
  // const { id, keys, message } = hub.createHub()
  // const { id, keys, message } = hub.createPerson()
  console.log("new id:", id)
  console.log("secret key:", keys.secretKey)
  console.log(`announce message:\n${message}`)

  const verified = hub.verifyMessage(message)
  console.log("verified?", verified)

}