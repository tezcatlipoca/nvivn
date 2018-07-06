const proquint = require('proquint')
const crypto = require('crypto')
const bs58 = require('bs58')
const signatures = require('sodium-signatures')
const low = require('lowdb')
const Memory = require('lowdb/adapters/Memory')
const oyaml = require('oyaml')
const timestamp = require('../timestamp')
const { sign, verify } = require('../signing')
const messages = require('../messages')
const labelValue = require('../label-value')
const createFilter = require('../filters')

class Hub {
  constructor(config) {
    if (!config || !config.id || !config.publicKey || !config.secretKey) {
      throw new Error("Must provide id, publicKey, and secretKey")
    }
    this.config = config
    this.hubId = config.id
    this.hubIdBuffer = proquint.decode(this.hubId)
    this.trustedKeys = config.trustedKeys || {}
    this.getPublicKeys = this.getPublicKeys.bind(this)
    this.hashAlgorithm = 'sha256'

    this.db = low(config.adapter || new Memory())
    this.db.defaults({ hubs: {} })
      .write()
  }

  getPublicKeys(id) {
    const trustedKeys = this.trustedKeys[id] || []
    const hub = this.db.get('hubs').get(id).value()
    const hubKeys = hub ? hub.publicKeys : []
    const allKeys = trustedKeys.concat(hubKeys)
    return id === this.hubId ? allKeys.concat([this.config.publicKey]) : allKeys
  }

  getTrustedKeys() {
    return Object.assign({}, this.trustedKeys, { [this.hubId]: this.getPublicKeys(this.hubId) })
  }

  createPerson(opts={}) {
    const personResult = this.createProfile(Buffer.concat([crypto.randomBytes(4), this.hubIdBuffer]), 'person', opts)
    if (this.writeMessage) this.writeMessage(personResult.message)
    return personResult
  }

  createHub(opts={}) {
    const hubResult = this.createProfile(crypto.randomBytes(2), 'hub', opts)
    if (this.writeMessage) this.writeMessage(hubResult.message)
    return hubResult
  }

  createProfile(idBuffer, type, opts={}) {
    const id = proquint.encode(idBuffer)
  
    const keyPair = signatures.keyPair()
    const keys = {
      secretKey: bs58.encode(keyPair.secretKey),
      publicKey: bs58.encode(keyPair.publicKey)
    }
  
    const t = timestamp.now()
    const announceMessage = Object.assign({t, id}, opts, { from:this.hubId, type:`${type}-profile`, t, id, publicKeys:[keys.publicKey] })
    const meta = {
      route: [{ id: this.hubId, t: timestamp.now()}],
      signed: [
        { id: this.hubId, signature: sign(announceMessage, this.config.secretKey) }
      ]
    }
    return {
      id,
      keys,
      message: messages.stringify({ body: announceMessage, meta}),
      config: oyaml.stringify(Object.assign({ id }, keys, { trustedKeys: this.getTrustedKeys() }))
    }
  }

  createMessage(messageString) {
    const { body, meta = {} } = messages.parse(messageString)
    const now = timestamp.now()
    meta.route = [{ id: this.hubId, t: now}]
    if (!meta.signed) meta.signed = []
    meta.signed.push({ id: this.hubId, signature: sign(body, this.config.secretKey) })
    // create a hash based on the message body and this first route hub and timestamp
    const hash = crypto.createHash(this.hashAlgorithm)
    hash.update(messageString)
    hash.update(this.hubId)
    hash.update(now)
    // meta.hash = `${this.hashAlgorithm}-${bs58.encode(hash.digest())}`
    meta.hash = `${this.hashAlgorithm}-${hash.digest('base64')}`
    const message = messages.stringify({ body, meta })
    if (this.writeMessage) this.writeMessage(message)
    return message
  }

  verifyMessage(message) {
    return verify(message, this.getPublicKeys)
  }

  showMessages(onMessage, filter=null, opts={}) {
    let filterFn = filter
    if (filter === null || filter === true) filterFn = () => true
    // if (typeof filter === 'string') filter = oyaml.parse(filter)
    if (typeof filter === 'string') {
      let filterString
      try {
        filterString = oyaml.parse(filter)
      } catch (err) {
        filterString = { body: filter }
      }
      filterFn = createFilter(filterString)
    } else if (typeof filter === 'object') {
      filterFn = createFilter(filter)
    }
    this.scanMessages(message => {
      let signedBy = []
      let warnings = []
      let signedBySender = false
      if (opts.validate) {
        if (!message.body.from) warnings.push("no 'from' field")
        const validationResult = this.verifyMessage(message)
        // if (!validationResult.verified) return
        for (let id in validationResult.details) {
          if (validationResult.details[id] === true) {
            let signedLabel = id
            if (message.body.from && message.body.from === id) {
              signedLabel += " (sender)"
              signedBySender = true
            }
            signedBy.push(signedLabel)
          }
        }
        if (!signedBySender) {
          warnings.push("not signed by sender")
        }
      }
      if (filterFn(message)) onMessage(message, { signedBy, warnings })
    })
  }

  async scanHubs() {
    return this.scanMessages(message => {
      const { body, meta } = message
      if (body.type === 'hub-profile') {
        const verificationResult = verify(message, this.getPublicKeys)
        if (verificationResult.verified) {
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
        } else {
          console.error(`Message from ${body.id} didn't pass verification`, verificationResult)
        }
      }
    })
  }

}

module.exports = Hub