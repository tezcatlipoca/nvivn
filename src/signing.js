const debug = require('debug')('othernet:signing')
const signatures = require('sodium-signatures')
const bs58 = require('bs58')
const oyaml = require('oyaml')
const messages = require('./messages')

const sign = function(message, secretKey) {
  const messageString = typeof message === 'string' ? message : oyaml.stringify(message)
  const signature = signatures.sign(new Buffer(messageString), bs58.decode(secretKey))
  // return signature.toString('base64')
  return bs58.encode(signature)
}

const verify = async function(inputMessage, getPublicKey) {
  const message = typeof inputMessage === 'string' ? messages.parse(inputMessage, { parseBody: false }) : inputMessage
  const sigResults = {}
  const bodyBuffer = new Buffer(message.rawBody)
  let anyVerified = false
  if (message.meta && message.meta.signed) {
    const promises = message.meta.signed.map(async ({ id, signature }) => {
      let pubKeys = await getPublicKey(id)
      if (!Array.isArray(pubKeys)) pubKeys = [pubKeys]
      if (pubKeys && pubKeys.length > 0) {
        pubKeys.forEach(pubKey => {
          if (sigResults[id] === true) return
          const pubKeyBuffer = bs58.decode(pubKey)
          let verificationResult = signatures.verify(bodyBuffer, Buffer.from(signature, 'base64'), pubKeyBuffer)
          if (!verificationResult) verificationResult = signatures.verify(bodyBuffer, bs58.decode(signature), pubKeyBuffer)
          sigResults[id] = verificationResult
          if (verificationResult) anyVerified = true
        })
      } else {
        sigResults[id] = undefined
      }
    })
    await Promise.all(promises)
  }
  return {
    verified: anyVerified,
    details: sigResults
  }
}

module.exports = {
  sign,
  verify
}
