const debug = process.env.DEBUG ? require('debug')('filter:verification') : () => {}
const through2 = require('through2')
// const { verify } = require('../signing')
const signatures = require('sodium-signatures')
const bs58 = require('bs58')

const verify = async function(parsedMessageObject) {
  const sigResults = {}
  const bodyBuffer = Buffer.from(parsedMessageObject.parts[0])
  let anyVerified = false
  const meta = parsedMessageObject.data[1]
  if (meta && meta.signed) {
    const promises = meta.signed.map(async ({ id, signature, publicKey }) => {
      // let pubKeys = await getPublicKey(id)
      let pubKeys = publicKey ? [publicKey] : []
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

module.exports = function(opts={}) {
  return through2.obj(async function(message, enc, callback) {
    const result = await verify(message)
    debug("verification result:", result)
    if (result.verified) {
      if (opts.includeInfo) {
        const mergedMessageData = Object.assign({ info: result }, message)
        this.push(mergedMessageData)
      } else {
        this.push(message)
      }
    }
    callback()
  })
}
