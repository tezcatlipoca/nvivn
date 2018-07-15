const debug = require('debug')('othernet:hub')
const proquint = require('proquint')
const crypto = require('crypto')
const bs58 = require('bs58')
const signatures = require('sodium-signatures')
const low = require('lowdb')
const Memory = require('lowdb/adapters/Memory')
const oyaml = require('oyaml')
const datemath = require('datemath-parser').parse
const escapeStringRegexp = require('escape-string-regexp')
const through2 = require('through2')
const pump = require('pump')
const timestamp = require('../timestamp')
const { sign, verify } = require('../signing')
const messages = require('../messages')
const labelValue = require('../label-value')
const createFilter = require('../filters')
const oyamlStream = require('../streams/oyaml')
const newlines = require('../streams/newlines')
const filterStream = require('../streams/filter')
const sinceFilterStream = require('../streams/since')
const verificationStream = require('../streams/verification')
const cacheFile = require('../cache-file')

const getFirst = function(...streams) {
  let resolved = false
  return new Promise((resolve, reject) => {
    const s = pump(...streams, (err) => {
      debug("--- getFirst stream done ---", err)
      if (err) return reject(err)
    })
    s.on('data', result => {
      debug("--- getFirst got data ---", result)
      if (!resolved) {
        resolve(result)
        s.destroy()
        resolved = true
      }
    })
    s.on('end', () => resolve(null))
  })
}

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

  // just this hub's key and the bootstrapped trusted keys
  // TODO add key lookup for trusted hubs and people
  getPublicKeys(id) {
    return id === this.hubId ? [this.config.publicKey] : this.trustedKeys[id]
  }

  getCommandStreams() {
    const context = {}
    const self = this
    const commandStream = through2.obj(async function(chunk, encoding, done) {

      // debug("handling input", chunk)
      let { cmd, op } = context
      let async = false

      if (!cmd) {
        [cmd] = chunk.data
        const op = cmd.op
        delete cmd.op
        let args = cmd
        context.cmd = cmd
        context.op = op

        if (op === 'profile') {
          let cacheReadStream
          if (args.id.includes('-')) {
            cacheReadStream = self.getProfileCacheStreams().read
          } else {
            cacheReadStream = self.getHubCacheStreams().read
          }
          const cache = await cacheFile(cacheReadStream)
          if (!cache.exists(args.id)) return
          const filter = filterStream({ id: args.id })
          const result = await getFirst(cache.getReadStream(), filter)
          this.push(result)
        } else if (op === 'messages') {
          async = true
          let source = self.getMessagesStream({ parts: true, original: true })
          const validate = args.validate
          delete args.validate
          const since = args.since
          delete args.since

          let bodyFilter = Object.assign({}, args)
          const hash = bodyFilter.hash
          delete bodyFilter.hash
          let metaFilter = {}
          if (hash) metaFilter.hash = hash
          if (Object.keys(bodyFilter).length > 0) {
            source = source.pipe(filterStream(bodyFilter, obj => obj.data[0]))
          }
          if (Object.keys(metaFilter).length > 0) {
            source = source.pipe(filterStream(metaFilter, obj => obj.data[1]))
          }
          if (since) {
            source = source.pipe(sinceFilterStream(since, self.hubId, obj => obj.data))
          }
          if (validate !== false) {
            source = source.pipe(verificationStream(self.getPublicKeys))
          }
          source.on('data', obj => {
            this.push(obj.original)
          })
          source.on('close', done)
        } else if (op === 'create-person') {
          const { config } = await self.createPerson(args)
          this.push(config)
        } else if (op === 'create-hub') {
          const { config } = await self.createHub(args)
          this.push(config)
        } else if (op === 'scan-hubs') {
          const { read, write, callback } = self.getHubCacheStreams()
          const filter = { type: 'hub-profile' }
          await self.syncCache({ read, write, filter, callback })
        } else if (op === 'scan-people') {
          const { read, write, callback } = self.getProfileCacheStreams()
          const filter = { type: 'person-profile' }
          await self.syncCache({ read, write, filter, callback })
        } else if (op === 'create-message') {
          const [_, body, meta] = chunk.parts
          const newMessage = [body, meta].join(" | ")
          debug("creating message:", newMessage)
          const result = await self.createMessage(newMessage)
          this.push(result)
        } else if (op === 'import-messages') {
          context.result = {
            processed: 0,
            imported: 0
          }
        } else {
          this.push({ error: `no command '${op}'` })
          context.cmd = null
        }
      } else {
        // it's multiline input, and we already have our op line
        if (op === 'import-messages') {
          const m = chunk.original
          debug("processing message", m)
          context.result.processed++
          const meta = chunk.data[1]
          // see if it's there already
          if (meta && meta.hash) {
            const filter = filterStream({ hash: meta.hash })
            const result = await getFirst(self.getMessagesStream(), filter)
            debug("found?", !!result)
            if (!result) {
              debug("appending message")
              await self.createMessage(m, { sign: false })
              context.result.imported++
            }
          }
        }
      }

      if (!async) done()
    }, function(done) {
      debug("-- flushing command stream --")
      debug("result:", context.result)
      // return final result on flush
      if (Object.keys(context.result).length > 0) {
        this.push(oyaml.stringify(context.result))
      }
      done()
    })
    const input = oyamlStream.parse({ array: true, parts: true, original: true })
    const output = input.pipe(commandStream).pipe(oyamlStream.stringify({ quoteSingleString: false })).pipe(newlines())
    return [input, output]
  }

  syncCache({ read, write, filter, callback }) {
    return new Promise(async resolve => {
      const cache = await cacheFile(read, write)
      const since = cache.metadata.synced || 0
      debug("last sync:", since)
      let source = this.getMessagesStream({ parts: true })
        .pipe(filterStream(filter, obj => obj.data[0]))
        .pipe(verificationStream(this.getPublicKeys))
        .pipe(sinceFilterStream(since, this.hubId, obj => obj.data, { saveSeen: true }))
      source.on('data', obj => {
        const profileRecord = {
          seen: obj.seen,
          id: obj.data[0].id,
          publicKeys: obj.data[0].publicKeys,
          hash: obj.data[1].hash
        }
        debug("got profile:", oyaml.stringify(profileRecord))
        cache.put(profileRecord)
      })
      source.on('finish', () => {
        cache.metadata.synced = Math.floor(Date.now() / 1000)
        debug("set last sync", cache.metadata.synced)
        cache.write().on('finish', async () => {
          debug("calling the cleanup/copy callback")
          await callback()
          resolve()
        })
      })
    })
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
      config: Object.assign({ id }, keys, { trustedKeys })
    }
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
      meta.hash = `${this.hashAlgorithm}-${bs58.encode(hash.digest())}`
      // meta.hash = `${this.hashAlgorithm}-${hash.digest('base64')}`
    }
    const message = messages.stringify({ body, meta })
    if (this.writeMessage) this.writeMessage(message)
    return message
  }

}

module.exports = Hub
