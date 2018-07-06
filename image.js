const fs = require('fs')
const steggy = require('steggy')
const text2png = require('text2png')

const messageFeed = fs.readFileSync('../route.earth/nuvuv/for-babab.txt', 'utf8')

const canvas = text2png('nuvuv -> babab 2018-07-06', {
  font: '80px Helvetica',
  textColor: 'black',
  bgColor: 'white',
  lineSpacing: 10,
  padding: 20
});

const original = canvas
// const original = fs.readFileSync('/Users/jkriss/Desktop/listen-up.png') // buffer
const message = messageFeed
 
// encoding should be supplied if message is provided as a string in non-default encoding
const concealed = steggy.conceal(/* optional password */)(original, message /*, encoding */)
fs.writeFileSync('./data.png', concealed)

const image = fs.readFileSync('./data.png')
// Returns a string if encoding is provided, otherwise a buffer
const revealed = steggy.reveal(/* optional password */)(image /*, encoding */)
console.log(revealed.toString())