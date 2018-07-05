var signatures = require('sodium-signatures')
const proquint = require("proquint")
const bs58 = require('bs58')
const { stringify } = require('oyaml')

var keys = signatures.keyPair()
console.log(stringify({
  secretKey: bs58.encode(keys.secretKey),
  publicKey: bs58.encode(keys.publicKey)
}))