const debug = require('debug')('othernet:hub')
const proquint = require('proquint')
const crypto = require('crypto')
const bs58 = require('bs58')
const signatures = require('sodium-signatures')
const low = require('lowdb')
const Memory = require('lowdb/adapters/Memory')
const oyaml = require('oyaml')
const escapeStringRegexp = require('escape-string-regexp')
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

  async command(cmdString) {
    debug('running command', cmdString)
    let input = oyaml.parse(cmdString)
    if (!Array.isArray(input)) input = [input]
    const [cmd, ...rest] = input
    debug('first part', cmd, 'rest', rest)

    const results = []

    if (cmd.cmd === 'messages') {
      debug('running messages command')
      await this.showMessages((m, info) => {
        const parts = [m.original]
        if (info && Object.keys(info).length > 0) parts.push(info)
        results.push(oyaml.stringify(parts))
      }, cmd)
    }

    return results.join("\n")
  }

  async getPublicKeys(id) {
    const trustedKeys = this.trustedKeys[id] || []
    const hub = this.db.get('hubs').get(id).value()
    const hubKeys = hub ? hub.publicKeys : []
    const profile = await this.getProfile(id)
    const profileKeys = profile ? profile.publicKeys : []
    const allKeys = trustedKeys.concat(hubKeys, profileKeys)
    return id === this.hubId ? allKeys.concat([this.config.publicKey]) : allKeys
  }

  async getTrustedKeys() {
    return Object.assign({}, this.trustedKeys, { [this.hubId]: await this.getPublicKeys(this.hubId) })
  }

  createPerson(opts={}) {
    return this.createProfile(Buffer.concat([crypto.randomBytes(4), this.hubIdBuffer]), 'person', opts)
  }

  createHub(opts={}) {
    return this.createProfile(crypto.randomBytes(2), 'hub', opts)
  }

  async createProfile(idBuffer, type, opts={}) {
    const id = proquint.encode(idBuffer)
  
    const keyPair = signatures.keyPair()
    const keys = {
      secretKey: bs58.encode(keyPair.secretKey),
      publicKey: bs58.encode(keyPair.publicKey)
    }
  
    const t = timestamp.now()
    const announceMessage = Object.assign({t, id}, opts, { from:this.hubId, type:`${type}-profile`, t, id, publicKeys:[keys.publicKey] })
    const message = this.createMessage(oyaml.stringify(announceMessage))
    const trustedKeys = await this.getTrustedKeys()
    return {
      id,
      keys,
      message,
      config: oyaml.stringify(Object.assign({ id }, keys, { trustedKeys }))
    }
  }

  async importMessages(messagesString) {
    const stats = {
      processed: 0,
      imported: 0
    }
    const promises = messagesString.split("\n").map(async m => {
      stats.processed++
      const { meta } = messages.parse(m)
      if (meta && meta.hash) {
        const exists = await this.messageExists(meta.hash)
        // console.log(meta.hash, "exists already?", exists)
        if (exists) return
      }
      this.createMessage(m, { sign: false })
      stats.imported++
    })
    await Promise.all(promises)
    console.log("import stats:", stats)
    return stats
  }

  createMessage(messageString, opts={ sign: true }) {
    const { body, meta = {} } = messages.parse(messageString)
    const now = timestamp.now()
    if (!meta.route) meta.route = []
    meta.route.push({ id: this.hubId, t: now })
    if (opts.sign) {
      if (!meta.signed) meta.signed = []
      meta.signed.push({ id: this.hubId, signature: sign(body, this.config.secretKey) })  
    }
    if (!meta.hash) {
      // create a hash based on the message body and this first route hub and timestamp
      const hash = crypto.createHash(this.hashAlgorithm)
      hash.update(messageString)
      hash.update(meta.route[0].id)
      hash.update(labelValue.getValue(meta.route[0].t))
      // meta.hash = `${this.hashAlgorithm}-${bs58.encode(hash.digest())}`
      meta.hash = `${this.hashAlgorithm}-${hash.digest('base64')}`
    }
    const message = messages.stringify({ body, meta })
    if (this.writeMessage) this.writeMessage(message)
    return message
  }

  verifyMessage(message) {
    return verify(message, this.getPublicKeys)
  }

  messageExists(hash) {
    const regex = new RegExp(`\\|.*hash:${escapeStringRegexp(hash)}($|"|\s)`)
    return new Promise(resolve => {
      this.scanLines(this.messageFile, line => {
        if (line.match(regex)) resolve(true)
      }).then(() => resolve(false))
    })
  }

  scanMessages(lineFn) {
    return this.scanLines(this.messageFile, line => {
      const m = messages.parse(line)
      lineFn(m)
    })
  }

  showMessages(onMessage, opts={}) {
    debug("opts:", opts)
    let filterFn = opts.filter
    if (filterFn === null || filterFn === true || typeof filterFn === 'undefined') {
      filterFn = () => true
    // if (typeof filter === 'string') filter = oyaml.parse(filter)
    } else if (typeof filterFn === 'string') {
      // let filterString
      // try {
      //   filterString = oyaml.parse(filterFn)
      // } catch (err) {
      //   filterString = { body: filterFn }
      // }
      // debug("filter string:", filterString)
      filterFn = createFilter(filterFn)
    } else if (typeof filterFn === 'object') {
      filterFn = createFilter(filterFn)
    }
    return this.scanMessages(async message => {
      if (filterFn(message)) {
        let signedBy = []
        let warnings = []
        let signedBySender = false
        let senderKeyNotAvailable = true
        if (opts.validate) {
          if (!message.body.from) warnings.push("no 'from' field")
          const validationResult = await this.verifyMessage(message)
          if (!validationResult.verified) {
            console.error(`message ${message.meta.hash} didn't pass validation`)
            return
          }
          senderKeyNotAvailable = typeof validationResult.details[message.body.from] === 'undefined'
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
          if (message.body.from && senderKeyNotAvailable) {
            warnings.push("sender key not available")
          } else if (!signedBySender) {
            warnings.push("not signed by sender")
          }
        }
        const info = {}
        if (signedBy.length > 0) info.signedBy = signedBy
        if (warnings.length > 0) info.warnings = warnings
        onMessage(message, info)
      }
    }, { reverse: opts.reverse })
  }

  async scanHubs() {
    return this.showMessages(({ body }) => {
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
    }, ({ body }) => body.type === 'hub-profile', { validate: true })
  }

  seenSince(route, since, hubId) {
    if (!hubId) hubId = this.hubId
    const hubRoute = route.find(r => r.id === hubId)
    if (!hubRoute) return false
    const receivedTime = timestamp.parse(hubRoute.t, { raw: true })
    return (typeof since === 'undefined' || receivedTime > since) ? receivedTime : false
  }

  messagesFor(hubId, since, onMessage) {
    return this.showMessages(m => {
      const otherHubSeenAlready = this.seenSince(m.meta.route, since, hubId)
      if (otherHubSeenAlready) return
      const receivedTimeIfNew = this.seenSince(m.meta.route, since)
      // console.log("seen time for", hubId, receivedTimeIfNew, "pass it along?", !!receivedTimeIfNew)
      if (!receivedTimeIfNew) return
      onMessage(m)
    })
  }

  async scanPeople(since) {

    if (typeof since === 'undefined') {
      if (this.lastProfileSync) {
        since = await this.lastProfileSync()
      }
    }

    return this.showMessages(({ body: { id, publicKeys }, meta: { route, hash } }) => {
      const receivedTimeIfNew = this.seenSince(route, since)
      if (!receivedTimeIfNew) return
      const profileString = oyaml.stringify({ seen:receivedTimeIfNew, id, publicKeys, hash })
      console.log(profileString)
      if (this.writeProfile) this.writeProfile(profileString)
    }, ({ body }) => (body.type === 'person-profile' && body.from === this.hubId), { validate: true })
  }

}

module.exports = Hub