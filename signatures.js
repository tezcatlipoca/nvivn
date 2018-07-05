var signatures = require('sodium-signatures')
const proquint = require("proquint")
const bs58 = require('bs58')

var keys = signatures.keyPair()
var message = new Buffer('a message')
 
var signature = signatures.sign(message, keys.secretKey)
console.log("signature:", signature.toString('base64'))
console.log("secret key:", bs58.encode(keys.secretKey))
console.log("public key:", bs58.encode(keys.publicKey))
var verified = signatures.verify(message, signature, keys.publicKey)
 
console.log('message was verified', verified)