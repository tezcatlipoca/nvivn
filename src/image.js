const fs = require('fs')
const steggy = require('steggy')
const text2png = require('text2png')

const encode = function(messages, name, password, size=24) {
  const imageData = text2png(name, {
    font: `${size}px Helvetica`,
    textColor: 'black',
    bgColor: 'white',
    lineSpacing: 10,
    padding: 20
  })
  try {
    const concealed = steggy.conceal(password)(imageData, messages, 'utf8')
    return concealed
  } catch (err) {
    if (err.message.includes('Image is not large enough')) {
      return encode(messages, name, password, size*1.5)
    } else {
      throw err
    }
  }
}

const decode = function(buffer, password) {
  return steggy.reveal(password)(buffer, 'utf8')
}

module.exports = {
  encode,
  decode
}

// const messageFeed = fs.readFileSync('../route.earth/nuvuv/for-babab.txt', 'utf8')

// const canvas = text2png('nuvuv -> babab 2018-07-06', {
//   font: '80px Helvetica',
//   textColor: 'black',
//   bgColor: 'white',
//   lineSpacing: 10,
//   padding: 20
// });

// const original = canvas
// // const original = fs.readFileSync('/Users/jkriss/Desktop/listen-up.png') // buffer
// const message = messageFeed

// // encoding should be supplied if message is provided as a string in non-default encoding
// const concealed = steggy.conceal(/* optional password */)(original, message /*, encoding */)
// fs.writeFileSync('./data.png', concealed)

// const image = fs.readFileSync('./data.png')
// // Returns a string if encoding is provided, otherwise a buffer
// const revealed = steggy.reveal(/* optional password */)(image /*, encoding */)
// console.log(revealed.toString())
