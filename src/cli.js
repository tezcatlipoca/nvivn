#!/usr/bin/env node

require('magicli')()

const messages = require('./messages')
const signing = require('./signing')
const config = require('./config')
const pretty = require('./pretty-oyaml')
const oyaml = require('oyaml')
const colors = require('colors')

const FileHub = require('./hub/file')

const hubConfig = config.loadLocalConfig()
const userConfig = config.loadUserConfig()
const hub = new FileHub(hubConfig)

module.exports.createHub = function(geo) {
  const opts = {}
  if (geo) opts.geo = geo
  const { config } = hub.createHub(opts)
  return pretty(config)
}

module.exports.createPerson = function(geo) {
  const opts = {}
  if (geo) opts.geo = geo
  const { config } = hub.createPerson(opts)
  return pretty(config)
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

module.exports.scanPeople = function() {
  hub.scanPeople()
  return 'done'
}

module.exports.showMessages = function(opts={}) {
  if (typeof opts === 'string') opts = oyaml.parse(opts)
  const { body, meta, notRouted } = opts
  const { validate } = opts
  hub.showMessages(({ rawBody, rawMeta }, { signedBy, warnings }) => console.log(`${rawBody}${opts.showMeta ? ` | ${rawMeta}`.gray : ''} ${signedBy.join(", ").green} ${warnings.join(", ").red}`), { body, meta, notRouted }, { validate })
}