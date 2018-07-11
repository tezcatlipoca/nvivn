const debug = require('debug')('othernet:cache-file')
const oyaml = require('oyaml')
const oyamlStream = require('./streams/oyaml')
const newlines = require('./streams/newlines')
const oyamlFrontMatter = require('../src/oyaml-front-matter').fromStream
const through2 = require('through2')

module.exports = async function(readStream, writeStream, { key='id' }={}) {
  const { frontMatter, bodyStream } = await oyamlFrontMatter(readStream)
  debug("loaded front matter:", frontMatter)
  const outStream = newlines()
  outStream.pipe(writeStream)
  const keys = {}
  if (frontMatter.keys) {
    frontMatter.keys.forEach(k => keys[k] = true)
  } else {
    frontMatter.keys = []
  }
  const newObjs = []
  const updatedObjs = []
  const put = obj => {
    const k = obj[key]
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
    outStream.write(oyaml.stringify({ keys: Object.keys(keys)}))
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
  return {
    metadata: frontMatter,
    setMetadata,
    put,
    write
  }
}
