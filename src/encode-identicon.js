const steggy = require('steggy')
const identiconImage = require('./identicon-image')
const canvas = require('canvas')
const { createCanvas } = canvas
global.Image = canvas.Image
const fs = require('fs')
const crypto = require('crypto')

const makeImage = async function(data, label, hash, size) {
  console.log("making image:", size)
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  await identiconImage(ctx, hash, label, size)
  console.log("original image:", canvas.toBuffer().length, "bytes")
  try {
    const concealed = steggy.conceal()(canvas.toBuffer(), data)
    console.log("concealed image:", concealed.length, "bytes")
    return concealed
  } catch (err) {
    if (err.message.includes('Image is not large enough')) {
      return makeImage(data, label, hash, size*2)
    } else {
      console.log("error encoding data in image:", err)
      throw err
    }
  }

}

const encode = async function(data, label, hash) {
  if (!hash) {
    // calculate the hash from the data
    const hashObj = crypto.createHash('sha256')
    hashObj.update(data)
    hash = hashObj.digest('hex')
  }
  // create the image
  const image = await makeImage(data, label, hash, 400)
  return image
}

const decode = function(buffer) {
  return steggy.reveal()(buffer)
}

if (require.main === module) {
  const path = require('path')
  const args = process.argv.slice(2)
  let inputFile = args[0] || 'package.json'
  const name = path.basename(inputFile)
  const data = fs.readFileSync(inputFile)
  let encoded
  encode(data, name)
    .then(img => {
      fs.writeFileSync('test.png', img)
      encoded = img
    })
    .then(() => {
      const decoded = decode(encoded)
      fs.writeFileSync(`decoded-${name}`, decoded)
    })
}
