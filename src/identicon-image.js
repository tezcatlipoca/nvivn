const jdenticon = require("jdenticon")
const { createCanvas, Image } = require('canvas')
const fs = require('fs')

jdenticon.config = {
    lightness: {
        color: [0.54, 0.80],
        grayscale: [0.59, 0.94]
    },
    saturation: {
        color: 0.68,
        grayscale: 0.00
    },
    backColor: "#000000ff"
    // backColor: "#fff"
};

const width = 400
// const height = width * 1.2
const height = width
// const label = "thing with descender"
// const label = "route.earth"
// const label = 'hozuj-lomuz-nuvuv'
// const label = 'kokos-gonoz-nuvuv'
const label = "babab"
// const label = "nuvuv"
const canvas = createCanvas(width, height)
const ctx = canvas.getContext('2d')

// const identicon = jdenticon.toPng("babab", width)
const identicon = jdenticon.toPng(label, width)

ctx.fillStyle = "white"
ctx.fillRect(0, 0, width, height)

const setFontSize = (ctx, string, fontSize, maxWidth) => {
  ctx.font = `bold ${fontSize}px "Roboto Mono"`;
  // console.log("trying", ctx.font)
  const te = ctx.measureText(string)
  // console.log("width is", te.width, "aiming for <", maxWidth)
  if (te.width > maxWidth) {
    return setFontSize(ctx, string, fontSize*0.95, maxWidth)
  }
}

const img = new Image()
img.onerror = err => { throw err }
img.onload = () => {
  console.log("image loaded")
  const margin = width / 30
  ctx.drawImage(img, 0, 0)

  setFontSize(ctx, label, width/5, width-(3*margin))
  const te = ctx.measureText(label)
  // TODO if this is wider than the image, shrink it
  ctx.fillStyle = 'rgba(255,255,255, 0.85)'
  // ctx.fillStyle = 'white'
  console.log("te:", te)
  const teHeight = te.actualBoundingBoxAscent + te.actualBoundingBoxDescent
  // console.log("teHeight:", teHeight)
  ctx.fillRect((width/2) - (te.width/2) - margin, (height/2) - (teHeight/2) - margin, te.width+(2*margin), teHeight+(2*margin))
  // ctx.fillRect(0, height-teHeight-(2*margin), width, teHeight+(2*margin))
  ctx.textAlign = 'center'
  // ctx.fillStyle = 'white'
  ctx.fillStyle = 'black'
  ctx.fillText(label, width/2, (height/2) + (teHeight/2) - (te.actualBoundingBoxDescent*0.8));
  // ctx.fillText(label, width/2, width+teHeight+margin);

  fs.writeFile('test.png', canvas.toBuffer());
}
img.src = identicon
