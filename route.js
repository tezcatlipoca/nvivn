const fs = require('fs')
const parser = require('oyaml')
require('colors')

const messageFeed = fs.readFileSync('./messages.txt', 'utf8')
const lines = messageFeed.split("\n")

const hubId = 'babaz'

lines.forEach(line => {
  const m = parser.parse(line)
  console.log(line)
  if (m.route && m.route.find(r => r.id === hubId)) {
    console.log("have already seen this message".gray)
  } else {
    if (!m.route) m.route = []
    m.route.push({
      id: hubId,
      t: Math.floor(Date.now()/1000)
    })
    console.log(parser.stringify(m).green)
  }
  // console.log(JSON.stringify(m))
})