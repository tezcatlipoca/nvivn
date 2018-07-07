const fs = require('fs')
const steggy = require('steggy')
const text2png = require('text2png')
const path = require('path')

const args = process.argv.slice(2)
console.log("args:", args)

const input = args[0]

const data = fs.readFileSync(input)

console.log("data length", data.length)

const canvas = text2png(path.basename(input), {
  font: '800px Helvetica',
  textColor: 'black',
  bgColor: 'white',
  lineSpacing: 10,
  padding: 2000
})

console.log(canvas)

// const original = canvas
// // const original = fs.readFileSync('/Users/jkriss/Desktop/listen-up.png') // buffer
// const message = messageFeed
 
// // encoding should be supplied if message is provided as a string in non-default encoding
const concealed = steggy.conceal(/* optional password */)(canvas, data /*, encoding */)
fs.writeFileSync('./data.png', concealed)

// const image = fs.readFileSync('./data.png')
// // Returns a string if encoding is provided, otherwise a buffer
// const revealed = steggy.reveal(/* optional password */)(image /*, encoding */)
// console.log(revealed.toString())