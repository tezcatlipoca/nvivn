const proquint = require('proquint')
const multibase = require('multibase')
const signatures = require('sodium-signatures')
const { generateId } = require('./passphrase-id')

module.exports = async function(idLength=3, opts={}) {
  console.log("generating id with opts", opts)
  let keyPair
  if (opts.username && opts.passphrase) {
    keyPair = await generateId(opts.username, opts.passphrase)
  } else {
    keyPair = signatures.keyPair()
  }
  // console.log("using keypair:", keyPair)
  keys = {
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
  const args = process.argv.slice(2)
  const words = 3
  module.exports(words, { username: args[0], passphrase: args[1]}).then(id => {
    console.log("public key length:", multibase.decode(id.publicKey).length)
    console.log("private key length:", multibase.decode(id.secretKey).length)
    console.log(JSON.stringify(id, null, 2))
  }).catch(console.error)
}