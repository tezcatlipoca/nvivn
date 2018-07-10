const oyaml = require('oyaml')
const oyamlStream = require('./streams/oyaml')
const newlines = require('./streams/newlines')
const oyamlFrontMatter = require('../src/oyaml-front-matter')
const through2 = require('through2')

module.exports = async function(readStream, writeStream, { key }) {
  const { frontMatter, bodyStream } = await oyamlFrontMatter(readStream)
  const outStream = newlines()
  outStream.pipe(writeStream)
  const keys = {}
  frontMatter.keys.forEach(k => keys[k] = true)
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
    delete frontMatter.keys
    outStream.write('---')
    outStream.write(oyaml.stringify(frontMatter))
    outStream.write(oyaml.stringify({ keys: Object.keys(keys)}))
    outStream.write('---')
    updatedObjs.concat(newObjs).forEach(obj => outStream.write(oyaml.stringify(obj)))
    const oldOnly = through2.obj(function(obj, enc, done) {
      // console.log("got chunk", obj)
      const unchanged = keys[obj[key]] === true
      // console.log("unchanged?", unchanged)
      if (unchanged) this.push(obj)
      done()
    })
    bodyStream.pipe(oyamlStream.stringify()).pipe(outStream)
 }
  return {
    metadata: frontMatter,
    setMetadata,
    put,
    write
  }
}