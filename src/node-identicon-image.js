const canvas = require('canvas')
const { createCanvas } = canvas
global.Image = canvas.Image
const fs = require('fs')
const identiconImage = require('./identicon-image')

module.exports = async (hash, label, size) => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  await identiconImage(ctx, hash, label, size)
  return canvas
}

if (require.main === module) {
  module.exports("nuvuv", "nuvuv", 500).then(canvas => {
    fs.writeFileSync('test.png', canvas.toBuffer())
  })
}
