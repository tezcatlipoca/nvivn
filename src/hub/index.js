require('dotenv').config()
const signatures = require('sodium-signatures')
const oyaml = require('oyaml')
const proquint = require('proquint')
const crypto = require('crypto')
const bs58 = require('bs58')
const timestamp = require('../timestamp')

const { HUB_ID, HUB_SECRET_KEY, HUB_PUBLIC_KEY } = process.env

const getPublicKey = function(id) {
  return id === HUB_ID ? HUB_PUBLIC_KEY : null
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
  const announceMessage = oyaml.stringify(Object.assign({t, id}, opts, { from:HUB_ID, type:'profile', t, id, publicKeys:[keys.publicKey] }))
  const meta = {
    route: [{ id: HUB_ID, t: timestamp.now()}],
    signed: [
      { id: HUB_ID, signature: createSignature(announceMessage) }
    ]
  }
  return {
    id,
    keys,
    message: `${announceMessage} | ${oyaml.stringify(meta)}`
  }
}

const verifyMessage = function(messageString) {
  const [body, metaString] = messageString.split("|").map(s => s.trim())
  const meta = oyaml.parse(metaString)
  const sigResults = {}
  const bodyBuffer = new Buffer(body)
  let anyVerified = false
  meta.signed.forEach(({ id, signature }) => {
    const pubKey = getPublicKey(id)
    if (pubKey) {
      const verificationResult = signatures.verify(bodyBuffer, Buffer.from(signature, 'base64'), bs58.decode(pubKey))
      sigResults[id] = verificationResult
      if (verificationResult) anyVerified = true
    } else {
      sigResults[id] = undefined
    }
  })
  return {
    verified: anyVerified,
    details: sigResults
  }
}

if (require.main === module) {
  // const { id, keys, message } = createHub({ geo: "San Francisco <9q8ywpy>" })
  const { id, keys, message } = createHub()
  console.log("new hub id:", id)
  console.log("secret key:", keys.secretKey)
  console.log(`announce message:\n${message}`)

  const verified = verifyMessage(message)
  console.log("verified?", verified)

}