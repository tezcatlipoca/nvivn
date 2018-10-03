const debug = process.env.DEBUG ? require('debug')('filter:verification') : () => {}
const through2 = require('through2')
const signatures = require('sodium-signatures')
const multibase = require('multibase')
const memoize = require('memoizee')

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
          let pubKeyBuffer, signatureBuffer
          try {
            pubKeyBuffer = multibase.decode(pubKey)
            signatureBuffer = multibase.decode(signature)
            let verificationResult = signatures.verify(bodyBuffer, signatureBuffer, pubKeyBuffer)
            if (!verificationResult) verificationResult = signatures.verify(bodyBuffer, signatureBuffer, pubKeyBuffer)
            sigResults[id] = verificationResult
            if (verificationResult) anyVerified = true
          } catch (err) {
            console.error(err)
            sigResults[id] = false
          }
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

const memoizedVerify = memoize(verify, { primitive: true, max:10000 })

module.exports = function(opts={}) {
  return through2.obj(async function(message, enc, callback) {
    const result = await memoizedVerify(message)
    debug("verification result:", result)
    if (result.verified) {
      if (opts.includeInfo) {
        const mergedMessageData = Object.assign({ info: result }, message)
        this.push(mergedMessageData)
      } else {
        this.push(message.original)
      }
    }
    callback()
  })
}
