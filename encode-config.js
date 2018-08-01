const triplesec = require('triplesec')
const { encode, decode } = require('./src/encode-identicon')
const oyaml = require('oyaml')
const fs = require('fs')

const encrypt = async (data, password) => {
  const config = oyaml.parse(data.toString())
  return new Promise((resolve, reject) => {
    triplesec.encrypt({ key: Buffer.from(password, 'utf8'), data }, async (err, encrypted) => {
      if (err) return reject(err)
      const img = await encode(encrypted, config.id, config.id)
      resolve(img)
    })
  })
}

const decrypt = (img, password) => {
  const data = decode(img)
  return new Promise((resolve, reject) => {
    return triplesec.decrypt({ key: Buffer.from(password, 'utf8'), data }, (err, result) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

if (require.main === module) {
  const args = process.argv.slice(2)
  const cmd = args[0]
  const filePath = args[1]
  const password = args[2]
  const data = fs.readFileSync(filePath)
  if (cmd === 'encrypt') {
    const config = oyaml.parse(data.toString())
    encrypt(data, password)
      .then(img => fs.writeFileSync(`${config.id}.png`, img))
      .catch(err => console.error(err))
  } else if (cmd === 'decrypt') {
    decrypt(data, password)
      .then(result => console.log("decrypted:\n", result.toString()))
      .catch(err => console.error(err))
  }
}
