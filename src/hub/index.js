require('dotenv').config()
const signatures = require('sodium-signatures')
const oyaml = require('oyaml')
const proquint = require('proquint')
const crypto = require('crypto')
const bs58 = require('bs58')
const timestamp = require('../timestamp')

const { HUB_ID, HUB_SECRET_KEY, HUB_PUBLIC_KEY } = process.env

const getPublicKey = function(id) {
  if (id === HUB_ID) return HUB_PUBLIC_KEY
  else throw new Error(`Don't have public key for ${id}`)
}

const createSignature = function(message) {
  const signature = signatures.sign(new Buffer(message), bs58.decode(HUB_SECRET_KEY))
  return signature.toString('base64')
}

const createHub = function(opts={}) {
  const id = proquint.encode(crypto.randomBytes(2))

  const keyPair = signatures.keyPair()
  const keys = {
    secretKey: bs58.encode(keyPair.secretKey),
    publicKey: bs58.encode(keyPair.publicKey)
  }

  const t = timestamp.now()
  // t:"2018-08-02 <1530548886>" from:bifov geo:"San Francisco <9q8ywpy>" type:profile created:"2018-08-02 <1530548886>" hosts:[url:"https://bifov.route.earth"]
  const announceMessage = oyaml.stringify(Object.assign({t, id}, opts, { from:HUB_ID, type:'hub-profile', t, id, publicKeys:[keys.publicKey] }))
  const signedMessage = addRoute(signMessage(announceMessage))
  return {
    id,
    keys,
    message: signedMessage
  }
}

const signMessage = function(message) {
  // TODO add the _key skipping here too, just in case those fields have been added already
  const sig = createSignature(message)
  let messageObj = oyaml.parse(message)
  messageObj._signature = sig
  return oyaml.stringify(messageObj)
}

const addRoute = function(message) {
  let m = oyaml.parse(message)
  if (!m._route) m._route = []
  m._route.push({ id: HUB_ID, t: timestamp.now()})
  return oyaml.stringify(m)
}

const verifyMessage = function(message) {
  const m = oyaml.parse(message)
  const sig = m._signature
  let originalMessageParts = {}
  Object.keys(m).forEach(k => {
    if (k[0] !== '_') originalMessageParts[k] = m[k]
  })
  const messageWithoutSig = oyaml.stringify(originalMessageParts)
  return signatures.verify(new Buffer(messageWithoutSig), Buffer.from(sig, 'base64'), bs58.decode(getPublicKey(m.from)))
}

if (require.main === module) {
  const { id, keys, message } = createHub({ geo: "San Francisco <9q8ywpy>" })
  console.log("new hub id:", id)
  console.log("secret key:", keys.secretKey)
  console.log("announce message:\n", message)

  const verified = verifyMessage(message)
  console.log("verified?", verified)

}