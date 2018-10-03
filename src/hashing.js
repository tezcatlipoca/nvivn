const multihash = require('multihashes')
const multibase = require('multibase')

const strToBuffer = (data) => {
  return typeof data === 'string' ? Buffer.from(data) : data
}

const hash = function(data, alg="sha2-256") {
  const inputs = Array.isArray(data) ? data : [data]
  const bufs = inputs.map(strToBuffer)
  const buf = Buffer.concat(bufs)
  return multihash.encode(buf, alg)
}

const hashEnc = function(data, alg="sha2-256", format="base64") {
  return encode(format, hash(data, alg))
}

const decode = multibase.decode
const encode = function(format, data) {
  return multibase.encode(format, data).toString()
}

module.exports = {
  hash,
  hashEnc,
  encode,
  decode
}

if (require.main === module) {
  const h = hash("Hi there")
  console.log(h)
  const h2 = hash(["Hi ","there"])
  console.log(h2)
  console.log(encode('base58flickr', h))
  console.log(encode('base58btc', h))
  console.log(encode('base16', h))
  console.log(encode('base64', h))

  console.log(decode(encode('base58flickr', h)))
}