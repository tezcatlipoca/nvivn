const fs = require('fs')
const parser = require('./messages')
const steggy = require('steggy')

const messageFeed = fs.readFileSync('./messages.txt', 'utf8')
 
const original = fs.readFileSync('/Users/jkriss/Desktop/listen-up.png') // buffer
const message = messageFeed
 
// encoding should be supplied if message is provided as a string in non-default encoding
const concealed = steggy.conceal(/* optional password */)(original, message /*, encoding */)
fs.writeFileSync('./data.png', concealed)

const image = fs.readFileSync('./data.png')
// Returns a string if encoding is provided, otherwise a buffer
const revealed = steggy.reveal(/* optional password */)(image /*, encoding */)
console.log(revealed.toString())