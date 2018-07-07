#!/usr/bin/env node

require('magicli')()

const debug = require('debug')('cli')
const messages = require('./messages')
const signing = require('./signing')
const config = require('./config')
const pretty = require('./pretty-oyaml')
const oyaml = require('oyaml')
const fs = require('fs')
const path = require('path')
require('colors')
const FileHub = require('./hub/file')
const image = require('./image')
const crypto = require('crypto')
const bs58 = require('bs58')

const hubConfig = config.loadLocalConfig()
const userConfig = config.loadUserConfig()

let hub
try {
  hub = new FileHub(hubConfig)
} catch (err) {
  console.log("hub config:", hubConfig)
  console.error(err)
}

module.exports.createHub = function(geo) {
  const opts = {}
  if (geo) opts.geo = geo
  hub.createHub(opts).then(({ config }) => pretty(config))
}

module.exports.createPerson = function(geo) {
  const opts = {}
  if (geo) opts.geo = geo
  hub.createPerson(opts).then(({config}) => pretty(config))
}

module.exports.createMessage = function(message, secretKey, id) {
  const { body } = messages.parse(message)
  if (!id) id = body.from || userConfig.id
  if (!secretKey) secretKey = userConfig.secretKey
  if (id && secretKey) {
    meta = {
      signed: [ { id, signature: signing.sign(message, secretKey) }]
    }
    message = messages.stringify({ body: message, meta })
  }
  return hub.createMessage(message)
}

module.exports.validateMessage = function(message, id, publicKey) {
  const getPublicKey = (entityId) => {
    console.log("getting public key for", entityId)
    if (entityId === id) return [publicKey]
    else return []
  }
  return signing.verify(message, getPublicKey)
}

module.exports.scanHubs = function() {
  hub.scanHubs()
  return 'done'
}

module.exports.scanPeople = function(since) {
  hub.scanPeople(typeof since === 'undefined' ? since : parseInt(since))
  return 'done'
}

module.exports.profile = function(id) {
  hub.getProfile(id).then(result => console.log(result))
}

module.exports.messageExists = function(hash) {
  debug('checking for', hash)
  hub.messageExists(hash).then(result => {
    console.log(`Does ${hash} exist?`, result)
    debug('done')
  })
}

module.exports.messagesFor = function(hubId, since, outFile, password) {
  const sinceArg = typeof since === 'undefined' ? since : parseInt(since)
  // hub.messagesFor(hubId, sinceArg, ({ rawBody, rawMeta }) => console.log(`${rawBody} | ${rawMeta }`))
  const messages = []
  hub.messagesFor(hubId, sinceArg, ({ rawBody, rawMeta }) => messages.push(`${rawBody} | ${rawMeta }`))
    .then(() => {
      const allMessages = messages.join("\n")
      if (outFile) {
        const suffix = path.extname(outFile)
        if (suffix === '.png') {
          fs.writeFileSync(outFile, image.encode(allMessages, `for ${hubId} ${new Date().toISOString().split('T')[0]}`, password))
        } else {
          fs.writeFileSync(outFile, allMessages)
        }
        console.log("wrote to", outFile)
      } else {
        console.log(allMessages)
      }
    })
}

module.exports.import = function(inFile, password) {
  const suffix = path.extname(inFile)
  console.log("importing file of type", suffix)
  let messages
  if (suffix === '.png') {
    messages = image.decode(fs.readFileSync(inFile), password)
  } else {
    messages = fs.readFileSync(inFile, 'utf8')
  }
  hub.importMessages(messages)
}

module.exports.inspect = function(inFile, password) {
  const suffix = path.extname(inFile)
  let messages
  if (suffix === '.png') {
    messages = image.decode(fs.readFileSync(inFile), password)
  } else {
    messages = fs.readFileSync(inFile, 'utf8')
  }
  console.log(messages)
}

module.exports.configImage = function(outFile, password) {
  let printPassword = false
  if (!password) {
    password = bs58.encode(crypto.randomBytes(12))
    printPassword = true
  }
  fs.writeFileSync(outFile, image.encode(oyaml.stringify(userConfig), userConfig.id, password))
  if (printPassword) console.log("password:", password)
}

module.exports.showMessages = function(opts={}) {
  if (typeof opts === 'string') opts = oyaml.parse(opts)
  const { body, meta, notRouted } = opts
  const { validate } = opts
  hub.showMessages(({ rawBody, rawMeta }, { signedBy, warnings }) => console.log(`${rawBody}${opts.showMeta ? ` | ${rawMeta}`.gray : ''} ${signedBy.join(", ").green} ${warnings.join(", ").red}`), { body, meta, notRouted }, { validate })
}