const signatures = require('sodium-signatures')
const bs58 = require('bs58')
const oyaml = require('oyaml')
const messages = require('./messages')

const sign = function(message, secretKey) {
  const messageString = oyaml.stringify(message)
  const signature = signatures.sign(new Buffer(messageString), bs58.decode(secretKey))
  return signature.toString('base64')
}

const verify = function(inputMessage, getPublicKey) {
  const message = typeof inputMessage === 'string' ? messages.parse(messageString, { parseBody: false }) : inputMessage
  const sigResults = {}
  const bodyBuffer = new Buffer(message.rawBody)
  let anyVerified = false
  message.meta.signed.forEach(({ id, signature }) => {
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

module.exports = {
  sign,
  verify
}