const debug = require('debug')('othernet:cache-file')
const oyaml = require('oyaml')
const oyamlStream = require('./streams/oyaml')
const newlines = require('./streams/newlines')
const oyamlFrontMatter = require('../src/oyaml-front-matter').fromStream
const through2 = require('through2')
const { CuckooFilter, BloomFilter, PartitionedBloomFilter } = require('bloom-filters')
const zlib = require('zlib')

module.exports = async function(readStream, writeStream, { key='id', bloomFilter }={}) {
  const { frontMatter, bodyStream } = await oyamlFrontMatter(readStream)
  let filter
  debug("loaded front matter:", frontMatter)
  const outStream = newlines()
  if (writeStream) outStream.pipe(writeStream)
  const keys = {}
  if (frontMatter.keys) {
    frontMatter.keys.forEach(k => keys[k] = true)
  } else {
    frontMatter.keys = []
  }
  if (bloomFilter) {
    if (frontMatter.filter) {
      // const jsonString = bs58.decode(msgpack.decode(frontMatter.filter))
      // filter = CuckooFilter.fromJSON(JSON.parse(jsonString))
      // filter = BloomFilter.fromJSON(JSON.parse(jsonString))
      console.log("loaded filter:", filter)
    } else {
      const [size, fingerprintLength, bucketSize] = [100000, 3, 4]
      filter = new CuckooFilter(size, fingerprintLength, bucketSize)
      // const [size, errorRate] = [10000, 0.01]
      // filter = new PartitionedBloomFilter(size, errorRate)
    }
  }
  const newObjs = []
  const updatedObjs = []
  const put = obj => {
    const k = obj[key]
    if (filter) filter.add(k)
    if (keys[k]) {
      updatedObjs.push(obj)
      keys[k] = 'updated'
    } else {
      newObjs.push(obj)
      keys[k] = true
    }
  }
  const setMetadata = (k, v) => frontMatter[k] = v
  const write = () => {
    debug("writing new cache file...")
    delete frontMatter.keys
    outStream.write('---')
    outStream.write(oyaml.stringify(frontMatter))
    if (!filter) {
      outStream.write(oyaml.stringify({ keys: Object.keys(keys)}))
    }
    if (filter) {
      const jsonString = JSON.stringify(filter.saveAsJSON())
      // const encoded = bs58.encode(msgpack.encode(jsonString))
      // const encoded = bs58.encode(zlib.gzipSync(jsonString))
      const binary = zlib.gzipSync(jsonString)
      const encoded = binary.toString('base64')
      const bloomFile = require('fs').createWriteStream('bloom.bin')
      bloomFile.write(encoded)
      bloomFile.end()
      // const encoded = jsonString
      outStream.write(oyaml.stringify({ filter: encoded }))
    }
    outStream.write('---')
    // debug("new objs:", newObjs, "updated objs:", updatedObjs)
    updatedObjs.concat(newObjs).forEach(obj => outStream.write(oyaml.stringify(obj)))
    const oldOnly = through2.obj(function(obj, enc, done) {
      debug("got chunk", obj)
      const unchanged = keys[obj[key]] === true
      debug("unchanged?", unchanged)
      if (unchanged) this.push(obj)
      done()
    })
    const stringify = oyamlStream.stringify()
    stringify.on('finish', () => debug("stringify done"))
    bodyStream.on('end', () => debug("bodystream done"))
    bodyStream.pipe(oldOnly).pipe(stringify).pipe(outStream)
    return outStream
 }
 const getReadStream = () => {
   return bodyStream
 }
 // FIXME this can only be run once, then the stream is exhausted
 const definitelyExists = async (k) => {
   return new Promise(resolve => {
     if (filter) {
       let done = false
       bodyStream.on('data', obj => {
         if (obj[key] === k) resolve(true)
         done = true
       })
       bodyStream.on('end', () => {
         if (done) resolve(false)
       })
     } else {
       resolve(!!keys[k])
     }
   })
 }
 const maybeExists = (k) => {
   // return !!keys[key]
   if (filter) {
     console.log("checking filter for", k)
     return filter.has(k)
   } else {
     return !!keys[k]
   }
 }
 const rate = () => {
   return filter && filter.rate ? filter.rate() : undefined
 }

return {
    metadata: frontMatter,
    setMetadata,
    put,
    write,
    getReadStream,
    maybeExists,
    definitelyExists,
    rate
  }
}
