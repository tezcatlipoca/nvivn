const split = require('split-string')
const crypto = require('crypto');
const bs58 = require('bs58')
const proquint = require("proquint")
const isNumber = require('is-number')

const hash = function(originalMessage) {
  const h = crypto.createHash('sha1');
  // console.log("hashing", originalMessage)
  h.update(originalMessage)
  return h.digest()
}

const parseKeyValue = function(entry, map) {
  const firstColon = entry.indexOf(':')
  const subparts = [entry.slice(0,firstColon) , entry.slice(firstColon+1)]
  let value = isNumber(subparts[1]) ? parseFloat(subparts[1]) : subparts[1]
    if (value[0] == '[') {
      let values = []
      // parse the list
      value.slice(1,value.length-2).split(',')
        .map(p => split(p, { separator: ' ' }))
        .forEach(stack => {
          const subMap = {}
          stack.forEach(e => {
            // console.log("parsing sub element", e)
            parseKeyValue(e, subMap)
          })
          values.push(subMap)  
        })
      value = values
    }
    map[subparts[0]] = value
}

const parse = function(originalMessage) {
  const parts = split(originalMessage, { separator: ' ', brackets: true })
  let m = {}
  parts.forEach(entry => {
    parseKeyValue(entry, m)
    // const firstColon = entry.indexOf(':')
    // const subparts = [entry.slice(0,firstColon) , entry.slice(firstColon+1)]
    // let value = isNumber(subparts[1]) ? parseFloat(subparts[1]) : subparts[1]
    // if (value[0] == '[') {
    //   // parse the list
    //   value = value.slice(1,value.length-2).split(',').map(p => split(p, { separator: ' ' }))
    // }
    // m[subparts[0]] = value
  })
  return m  
}

const messageId = function(message) {
  // const encoder = bs58
  const encoder = proquint
  // const encoder = {
  //   encode: (buf) => buf.toString('hex')
  // }
  // first part based on send time
  let d
  if (isNumber(message.t)) {
    d = new Date(message.t * 1000)
  } else {
    d = new Date(message.t)
  }
  const time = Math.floor(d.getTime()/1000)
  const buf = Buffer.allocUnsafe(6)
  buf.writeUIntBE(time, 0, 6);
  // const encodedTime = encoder.encode(buf)
  const encodedTime = time.toString('16')
  // second part based on sender and message
  const idParts = message.f.split('#')
  const senderId = idParts[idParts.length-1]
  const encodedSender = encoder.encode(proquint.decode(senderId))
  // grab a few bits of content hash to avoid time + id collisions
  const shortContentHash = encoder.encode(hash(message.m).slice(0,2))
  return `${encodedTime} ${encodedSender} ${shortContentHash}`
}

if (require.main === module) {
  const message = `t:2018-07-01 f:jesse#bamab-nidam-nufit m:"Hi there!!!" exp:2018-07-02 geo:9q8ywpy`
  const message2 = `t:1530403105 f:jesse#babab-povul-jonur m:"Hi there!" exp:2018-07-02 geo:9q8ywpy`
  console.log("-- digest ids --")
  // console.log(parse(message))
  console.log(bs58.encode(hash(message)))
  console.log(bs58.encode(hash(message2)))
  console.log("-- time + sender + content id --")
  console.log(messageId(parse(message)))
  console.log(messageId(parse(message2)))
}

module.exports = {
  parse
}