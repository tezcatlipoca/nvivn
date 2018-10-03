const proquint = require('proquint')
const multibase = require('multibase')
const signatures = require('sodium-signatures')

module.exports = function(idLength=3) {
  const keyPair = signatures.keyPair()
  const keys = {
    secretKey: multibase.encode('base58flickr', keyPair.secretKey).toString(),
    publicKey: multibase.encode('base58flickr', keyPair.publicKey).toString()
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