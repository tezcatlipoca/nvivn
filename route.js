const fs = require('fs')
const parser = require('oyaml')

const messageFeed = fs.readFileSync('./messages.txt', 'utf8')
const lines = messageFeed.split("\n")

lines.forEach(line => {
  const m = parser.parse(line)
  console.log(JSON.stringify(m))
})