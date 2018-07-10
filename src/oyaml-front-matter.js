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
    input.on('readable', () => {
      const line = input.read()
      console.log("line:", line)
      if (!started) {
        if (line === BOUNDARY) {
          isFrontMatter = true
          started = true
        } else {
          // this isn't a front matter file, return the read buffer and add the first line back in
          let firstLine = true
          const body = new Readable({
            read(size) {
              if (firstLine) {
                firstLine = false
                this.push(line)
              } else {
                this.push(input.read(size))
              }
            }
          });
          resolve({ frontMatter: {}, bodyStream: body.pipe(oyamlStream.parse()) })
        }
      } else if (line === BOUNDARY) {
        // it's over, wrap it up and resolve
        const frontMatter = oyaml.parse(fmLines.join(' '))
        resolve({ frontMatter, bodyStream: input.pipe(oyamlStream.parse())})
      } else if (isFrontMatter) {
        // we're in front matter, hold on to it
        fmLines.push(line)
      }
    })
  })
}