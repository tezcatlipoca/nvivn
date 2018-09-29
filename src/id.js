const proquint = require('proquint')
const crypto = require('crypto')
const bs58 = require('bs58')
const signatures = require('sodium-signatures')

module.exports = function(idLength=3) {
  // const idBuffer = crypto.randomBytes(idLength * 2)
  // const id = proquint.encode(idBuffer)+suffix
  const keyPair = signatures.keyPair()
  const keys = {
    secretKey: bs58.encode(keyPair.secretKey),
    publicKey: bs58.encode(keyPair.publicKey)
  }
  const id = proquint.encode(keyPair.publicKey.slice(0,idLength*2))
  return {
    id,
    ...keys
  }
}

if (require.main === module) {
  const words = process.argv.slice(2)[0]
  const id = module.exports(words)
  console.log(JSON.stringify(id, null, 2))
}