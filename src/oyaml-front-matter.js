const debug = require('debug')('oyaml-front-matter')
const split2 = require('split2')
const through2 = require('through2')
const oyaml = require('oyaml')
const { Readable } = require('stream')
const oyamlStream = require('./streams/oyaml')

const BOUNDARY = "---"

const fromString = async function(str) {
  const inStream = new Readable({
    read() {}
  });
  inStream.push(str)
  inStream.push(null)
  const { frontMatter, bodyStream } = await fromStream(inStream)
  const data = []
  bodyStream.on('data', obj => data.push(obj))
  return new Promise(resolve => {
    bodyStream.on('end', () => {
      resolve({ frontMatter, body: data })
    })
  })
}

const fromStream = function(readStream) {
  return new Promise((resolve, reject) => {
    const input = readStream.pipe(split2())
    let fmLines = []
    let isFrontMatter = false
    let started = false
    let ended = false
    let frontMatter = {}
    let body = through2.obj(function(chunk, encoding, callback) {
      this.push(chunk)
      callback()
    })
    let out
    input.on('error', err => {
      console.error("stream error", err)
      reject(err)
    })
    input.on('end', () => {
      debug("input stream ended")
      if (!ended) {
        debug("-- input stream ended early --")
        debug("pushing empty stream back")
        resolve({ frontMatter, bodyStream: new Readable({ read(){
          debug("!! empty reader !!")
          this.push(null)
        } }) })
      } else {
        // if it's an existing stream, close it
        if (out) out.end()
      }
    })
    input.on('data', line => {
      debug("read line", line)
      // const line = input.read()
      if (ended) {
        if (!line) return body.end()
        body.write(line)
        return
      }
      if (!started) {
        started = true
        if (line === BOUNDARY) {
          isFrontMatter = true
        } else {
          // this isn't a front matter file, return the read buffer and add the first line back in
          body.write(line)
          debug("!!! not a fm file, resolving. line:", line)
          resolve({ frontMatter: {}, bodyStream: body.pipe(oyamlStream.parse()) })
        }
      } else if (line === BOUNDARY) {
        debug("front matter parsing done")
        ended = true
        frontMatter = oyaml.parse(fmLines.join(' '))
        out = body.pipe(oyamlStream.parse())
        out.on('end', () => debug("---- out stream ended ----"))
        debug("set up pipe. flowing?", out.readableFlowing)
        resolve({ frontMatter, bodyStream: out })
      } else if (isFrontMatter) {
        fmLines.push(line)
      }
    })
  })
}

module.exports = {
  fromString,
  fromStream
}
