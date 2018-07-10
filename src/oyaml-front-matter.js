const split2 = require('split2')
const through2 = require('through2')
const oyaml = require('oyaml')
const { Readable } = require('stream')
const oyamlStream = require('./streams/oyaml')

const BOUNDARY = "---"

module.exports = function(readStream) {
  return new Promise((resolve, reject) => {
    const input = readStream.pipe(split2())
    let fmLines = []
    let isFrontMatter = false
    let started = false
    let ended = false
    let body = through2.obj(function(chunk, encoding, callback) {
      this.push(chunk)
      callback()
    })
    input.on('data', line => {
      // const line = input.read()
      if (ended) {
        if (!line) return body.end()
        body.write(line)
        return
      }
      if (!started) {
        if (line === BOUNDARY) {
          isFrontMatter = true
          started = true
        } else {
          // this isn't a front matter file, return the read buffer and add the first line back in
          body.write(line)
          resolve({ frontMatter: {}, bodyStream: body.pipe(oyamlStream.parse()) })
        }
      } else if (line === BOUNDARY) {
        ended = true
        const frontMatter = oyaml.parse(fmLines.join(' '))
        resolve({ frontMatter, bodyStream: body.pipe(oyamlStream.parse()) })
      } else if (isFrontMatter) {
        fmLines.push(line)
      }
    })
  })
}