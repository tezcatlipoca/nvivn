const jdenticon = require("jdenticon")
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

const setFontSize = (ctx, string, fontSize, maxWidth) => {
  ctx.font = `bold ${fontSize}px "Roboto Mono"`;
  // console.log("trying", ctx.font)
  const te = ctx.measureText(string)
  // console.log("width is", te.width, "aiming for <", maxWidth)
  if (te.width > maxWidth) {
    return setFontSize(ctx, string, fontSize*0.95, maxWidth)
  }
}

module.exports = (ctx, hash, label, size) => {
  const width = size
  const height = width

  const identicon = jdenticon.toPng(hash, width)

  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)

  const img = new Image()

  return new Promise((resolve, reject) => {
    img.onerror = err => reject
    img.onload = () => {
      const margin = width / 30
      ctx.drawImage(img, 0, 0)

      setFontSize(ctx, label, width/5, width-(3*margin))
      const te = ctx.measureText(label)
      // TODO if this is wider than the image, shrink it
      ctx.fillStyle = 'rgba(255,255,255, 0.85)'
      // console.log("te:", te)
      const teHeight = te.actualBoundingBoxAscent + te.actualBoundingBoxDescent
      ctx.fillRect((width/2) - (te.width/2) - margin, (height/2) - (teHeight/2) - margin, te.width+(2*margin), teHeight+(2*margin))
      ctx.textAlign = 'center'
      ctx.fillStyle = 'black'
      ctx.fillText(label, width/2, (height/2) + (teHeight/2) - (te.actualBoundingBoxDescent*0.8));
      resolve()
    }
    img.src = identicon
  })
}
