#!/usr/bin/env node

require('magicli')()
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.hub') })

const messages = require('./messages')
const signing = require('./signing')

const FileHub = require('./hub/file')

const hub = new FileHub({ hubId: process.env.ID, publicKey: process.env.PUBLIC_KEY, secretKey: process.env.SECRET_KEY })

module.exports.createHub = function(geo) {
  const opts = {}
  if (geo) opts.geo = geo
  const { id, keys, message } = hub.createHub(opts)
  console.log("new id:", id)
  console.log("public key:", keys.publicKey)
  console.log("secret key:", keys.secretKey)
  return 'done'
}

module.exports.createPerson = function(geo) {
  const opts = {}
  if (geo) opts.geo = geo
  const { id, keys, message } = hub.createPerson(opts)
  console.log("new id:", id)
  console.log("secret key:", keys.secretKey)
  return 'done'
}

module.exports.createMessage = function(message, id, secretKey) {
  console.log("handling message", message)
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