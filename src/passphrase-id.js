const BLAKE2s = require('blake2s-js')
const scrypt = require('scrypt-async')
const sodium = require('sodium-universal')
const zxcvbn = require('zxcvbn')

function getScryptKey(key, salt, callback) {
  const opts = {
    logN: 17,
    r: 8,
    interruptStep: 1000,
    dkLen: 64,
    encoding: 'binary'
  }
  scrypt(key, salt, opts, callback)
}

function getKeyPair(key, salt, callback) {
  const keyHash = new BLAKE2s(32)
  keyHash.update(Buffer.from(key))

  getScryptKey(keyHash.digest(), Buffer.from(salt),
      secretKey => {
        // console.log("private key is:", multibase.encode('base58flickr', keyBytes).toString())
        const publicKey = Buffer.allocUnsafe(sodium.crypto_scalarmult_BYTES)
        sodium.crypto_scalarmult_base(publicKey, secretKey)
        callback({ publicKey, secretKey })
      })
}

function generateId(username, passphrase) {
  const strength = zxcvbn(passphrase.toString())
  // console.log("passphrase strength:", strength.score, strength.crack_times_display, strength.feedback)
  return new Promise((resolve, reject) => {
    if (strength.score < 4) {
      let message = [strength.feedback.warning].concat(strength.feedback.suggestions).join(' ')
      if (message.trim() === '') message = "Add more words or characters to your passphrase"
      return reject(new Error(message))
    }
    getKeyPair(passphrase, username, keyPair => {
      resolve(keyPair)
    })
  })
}

module.exports = {
  generateId
}