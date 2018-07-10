const tap = require('tap')
const path = require('path')
const fs = require('fs')
const oyamlFrontMatter = require('../src/oyaml-front-matter')

tap.test('get front matter and body stream', async (t) => {
  const file = path.join(__dirname, 'data', 'oyaml-front-matter.txt')
  const { frontMatter, bodyStream } = await oyamlFrontMatter(fs.createReadStream(file, 'utf8'))
  t.same(frontMatter, { 'last-sync': 'some-timestamp' })
  const data = []
  bodyStream.on('data', obj => data.push(obj))
  bodyStream.on('end', () => {
    t.same(data, [{ id: 1, message: 'hi' }, { id: 2, message: 'there' }])
    t.done()  
  })
  t.done()
})

tap.test('works without front matter, too', async (t) => {
  const file = path.join(__dirname, 'data', 'oyaml-no-front-matter.txt')
  const { frontMatter, bodyStream } = await oyamlFrontMatter(fs.createReadStream(file, 'utf8'))
  t.same(frontMatter, {})
  const firstLine = bodyStream.read()
  t.same(firstLine, { id: 1, message: 'hi' })
  t.done()
})