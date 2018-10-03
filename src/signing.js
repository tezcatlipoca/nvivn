const debug = require('debug')('othernet:signing')
const signatures = require('sodium-signatures')
const multibase = require('multibase')
const oyaml = require('oyaml')
const messages = require('./messages')

const sign = function(message, secretKey) {
  const messageString = typeof message === 'string' ? message : oyaml.stringify(message)
  try {
    const secretKeyBuffer = multibase.decode(secretKey)
    const signature = signatures.sign(Buffer.from(messageString), secretKeyBuffer)
    // return signature.toString('base64')
    return multibase.encode('base58flickr', signature).toString()
  } catch (err) {
    throw new Error("Couldn't decode secret key")
  }
}

const verify = async function(inputMessage, getPublicKey) {
  const message = typeof inputMessage === 'string' ? messages.parse(inputMessage, { parseBody: false }) : inputMessage
  const sigResults = {}
  const bodyBuffer = Buffer.from(message.rawBody)
  let anyVerified = false
  if (message.meta && message.meta.signed) {
    const promises = message.meta.signed.map(async ({ id, signature }) => {
      let pubKeys = await getPublicKey(id)
      if (!Array.isArray(pubKeys)) pubKeys = [pubKeys]
      if (pubKeys && pubKeys.length > 0) {
        pubKeys.forEach(pubKey => {
          if (sigResults[id] === true) return
          const pubKeyBuffer = multibase.decode(pubKey)
          const signatureBuffer = multibase.decode(signature)
          let verificationResult = signatures.verify(bodyBuffer, signatureBuffer, pubKeyBuffer)
          if (!verificationResult) verificationResult = signatures.verify(bodyBuffer, signatureBuffer, pubKeyBuffer)
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
