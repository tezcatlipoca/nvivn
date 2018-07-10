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

const getFirst = function(...streams) {
  return new Promise((resolve, reject) => {
    const s = pump(...streams, (err) => {
      debug("--- getFirst stream done ---", err)
      if (err) return reject(err)
    })
    s.on('data', result => {
      debug("--- getFirst got data ---", result)
      resolve(result)
      s.destroy()
    })
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
      
      debug("handling input", chunk)

      let { cmd, op } = context
      let async = false

      if (!cmd) {
        [cmd] = chunk.data
        const op = cmd.op
        delete cmd.op
        let args = cmd
        context.cmd = cmd

        if (op === 'profile') {
          const source = self.getProfileStream(args.id)
          const filter = filterStream({ id: args.id })
          const result = await getFirst(source, filter)
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
        // } else if (op === 'scan-people') {
        //   let source = self.getMessagesStream({ parts: true })
        //     .pipe(filterStream({ type: 'person-profile', obj => obj.data[0]))
        //     // .pipe(verificationStream(self.getPublicKeys))
        } else if (op === 'scan-hubs') {
          async = true
          // TODO store last sync time and use that?
          let since = 0
          let source = self.getMessagesStream({ parts: true })
            .pipe(filterStream({ type: 'hub-profile' }, obj => obj.data[0]))
            .pipe(verificationStream(self.getPublicKeys))
            .pipe(sinceFilterStream(since, self.hubId, obj => obj.data, { saveSeen: true }))
          source.on('data', obj => {
            const profileRecord = {
              seen: obj.seen,
              id: obj.data[0].id,
              publicKeys: obj.data[0].publicKeys,
              hash: obj.data[1].hash
            }
            console.log(oyaml.stringify(profileRecord))
          })
          source.on('close', done)
        } else {
          this.push({ error: `no command '${op}'` })
          context.cmd = null
        }
      }

      if (!async) done()
    })
    const input = oyamlStream.parse({ array: true, parts: true })
    const output = input.pipe(commandStream).pipe(oyamlStream.stringify({ quoteSingleString: false })).pipe(newlines())
    return [input, output]
  }

  // getCommandStream() {
  //   const self = this
  //   const context = {}
  //   let result = {}
  //   const commandStream = through2(async function(chunk, encoding, done) {
  //     let { cmd, op } = context
  //     const pushString = str => this.push(str+"\n")
  //     const push = data => pushString(oyaml.stringify(data))
  //     if (!cmd) {
  //       [cmd] = oyaml.parse(chunk.toString(), { array: true })
  //       debug("got", cmd)
  //       const op = cmd.op
  //       context.op = op
  //       delete cmd.op
  //       const args = cmd
  //       context.cmd = cmd
  //       debug("context now:", context)
  //       // single line commands
  //       if (op === 'messages') {
  //         debug("-- messages --")
  //         await self.showMessages((m, info) => {
  //           pushString(m.original)
  //         }, Object.assign({ validate: true }, args))
  //         debug("-- end messages --")
  //       } else if (op === 'import-messages') {
  //         debug("-- import messages --")
  //           result = {
  //             processed: 0,
  //             imported: 0
  //           }
  //       } else if (op === 'create-person') {
  //         const { config } = await self.createPerson(args)
  //         push(config)
  //       } else if (op === 'create-hub') {
  //         const { config } = await self.createHub(args)
  //         push(config)
  //       } else if (op === 'profile') {
  //         const profile = await self.getProfile(args.id)
  //         debug("got profile", profile, "for", args.id)
  //         if (profile) push(profile)
  //       } else if (op === 'create-message') {
  //         const rawPayload = oyaml.parts(chunk.toString()).slice(1).join(" | ")
  //         const message = await self.createMessage(rawPayload)
  //         pushString(message)
  //       } else if (op === 'scan-people') {
  //         await self.scanPeople(args.since)
  //       } else if (op === 'scan-hubs') {
  //         await self.scanHubs()
  //       } else {
  //         debug("ignoring command", op)
  //         push({ error: `no command '${op}'` })
  //         context.cmd = null
  //       }
  //     } else {
  //       // debug("continuing", op, chunk.toString())
  //       if (op === 'import-messages') {
  //         const m = chunk.toString()
  //         debug("processing message", m)
  //         const { meta } = messages.parse(m)
  //         result.processed++
  //         let skip = false
  //         if (meta && meta.hash) {
  //           const exists = await self.messageExists(meta.hash)
  //           debug(meta.hash, "exists already?", exists)
  //           if (exists) skip = true
  //         }
  //         if (!skip) {
  //           self.createMessage(m, { sign: false })
  //           result.imported++              
  //         }

  //       }
  //     }
  //     done()
  //   }, function(cb) {
  //     debug("-- flushing command stream --")
  //     debug("result:", result)
  //     // return final result on flush
  //     if (Object.keys(result).length > 0) {
  //       this.push(oyaml.stringify(result)+"\n")
  //     }
  //     cb()
  //   })
  //   return commandStream
  // }

  // async getPublicKeys(id) {
  //   const trustedKeys = this.trustedKeys[id] || []
  //   const hub = this.db.get('hubs').get(id).value()
  //   const hubKeys = hub ? hub.publicKeys : []
  //   debug("about to get profile", id)
  //   const profile = await this.getProfile(id)
  //   debug("got profile:", profile)
  //   const profileKeys = profile ? profile.publicKeys : []
  //   const allKeys = trustedKeys.concat(hubKeys, profileKeys)
  //   return id === this.hubId ? allKeys.concat([this.config.publicKey]) : allKeys
  // }

  // async getTrustedKeys() {
  //   return Object.assign({}, this.trustedKeys, { [this.hubId]: await this.getPublicKeys(this.hubId) })
  // }

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

  // verifyMessage(message) {
  //   return verify(message, this.getPublicKeys)
  // }

  // messageExists(hash) {
  //   const regex = new RegExp(`\\|.*hash:${escapeStringRegexp(hash)}($|"|\\s)`)
  //   return new Promise(resolve => {
  //     this.scanLines(this.messageFile, line => {
  //       if (line.match(regex)) resolve(true)
  //     }).then(() => resolve(false))
  //   })
  // }

  // scanMessages(lineFn) {
  //   return this.scanLines(this.messageFile, async line => {
  //     const m = messages.parse(line)
  //     await lineFn(m)
  //   })
  // }

  // showMessages(onMessage, opts={}) {
  //   debug('showing messages', opts)
  //   let since = opts.since
  //   if (typeof since === 'string') {
  //     since = Math.floor(datemath(since) / 1000)
  //     debug("since is now", since)
  //   }
  //   delete opts.since
  //   const validate = opts.validate
  //   delete opts.validate
  //   debug("remaining opts (treating as filter):", opts)
  //   let filterFn = opts
  //   if (filterFn === null || filterFn === true || typeof filterFn === 'undefined') {
  //     filterFn = () => true
  //   } else if (typeof filterFn === 'string') {
  //     filterFn = createFilter(filterFn)
  //   } else if (typeof filterFn === 'object') {
  //     filterFn = createFilter(filterFn)
  //   }
  //   return this.scanMessages(async message => {
  //     if (filterFn(message)) {
  //       // check route time for this hub, use that to filter based on "since"
  //       if (since && message.meta && message.meta.route) {
  //         const thisHubRoute = message.meta.route.find(r => r.id === this.hubId)
  //         if (thisHubRoute && parseInt(labelValue.getValue(thisHubRoute.t)) <= since) return
  //       }
  //       let signedBy = []
  //       let warnings = []
  //       let signedBySender = false
  //       let senderKeyNotAvailable = true
  //       if (validate) {
  //         debug("validating...")
  //         if (!message.body.from) warnings.push("no 'from' field")
  //         const validationResult = await this.verifyMessage(message)
  //         debug("validation result:", validationResult)
  //         if (!validationResult.verified) {
  //           console.error(`message ${message.meta.hash} didn't pass validation`)
  //           return
  //         }
  //         senderKeyNotAvailable = typeof validationResult.details[message.body.from] === 'undefined'
  //         for (let id in validationResult.details) {
  //           if (validationResult.details[id] === true) {
  //             let signedLabel = id
  //             if (message.body.from && message.body.from === id) {
  //               signedLabel += " (sender)"
  //               signedBySender = true
  //             }
  //             signedBy.push(signedLabel)
  //           }
  //         }
  //         if (message.body.from && senderKeyNotAvailable) {
  //           warnings.push("sender key not available")
  //         } else if (!signedBySender) {
  //           warnings.push("not signed by sender")
  //         }
  //       }
  //       const info = {}
  //       if (signedBy.length > 0) info.signedBy = signedBy
  //       if (warnings.length > 0) info.warnings = warnings
  //       onMessage(message, info)
  //     }
  //   }, { reverse: opts.reverse })
  // }

  // async scanHubs() {
  //   return this.showMessages(({ body }) => {
  //     const timeValue = parseInt(labelValue.getValue(body.t))
  //     // only update the hub info if the timestamp of this message is newer
  //     const h = this.db.get('hubs').get(body.id).value()
  //     if (h && h.t >= timeValue) {
  //       console.log("Already have newer (or latest) record for", body.id)
  //     } else {
  //       const hubData = { id: body.id, publicKeys: body.publicKeys, t: timeValue, message: line }
  //       if (body.geo) hubData.geo = labelValue.getValue(body.geo)
  //       this.db.get('hubs')
  //         .set(body.id, hubData)
  //         .write()
  //     }
  //   }, ({ body }) => body.type === 'hub-profile', { validate: true })
  // }

  // seenSince(route, since, hubId) {
  //   if (!hubId) hubId = this.hubId
  //   const hubRoute = route.find(r => r.id === hubId)
  //   if (!hubRoute) return false
  //   const receivedTime = timestamp.parse(hubRoute.t, { raw: true })
  //   return (typeof since === 'undefined' || receivedTime > since) ? receivedTime : false
  // }

  // async scanPeople(since) {

  //   if (typeof since === 'undefined') {
  //     if (this.lastProfileSync) {
  //       since = await this.lastProfileSync()
  //     }
  //   }

  //   return this.showMessages(({ body: { id, publicKeys }, meta: { route, hash } }) => {
  //     const receivedTimeIfNew = this.seenSince(route, since)
  //     if (!receivedTimeIfNew) return
  //     const profileString = oyaml.stringify({ seen:receivedTimeIfNew, id, publicKeys, hash })
  //     // console.log(profileString)
  //     if (this.writeProfile) this.writeProfile(profileString)
  //   }, ({ body }) => (body.type === 'person-profile' && body.from === this.hubId), { validate: true })
  // }

}

module.exports = Hub