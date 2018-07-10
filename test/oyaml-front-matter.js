const tap = require('tap')
const path = require('path')
const fs = require('fs')
const oyamlFrontMatter = require('../src/oyaml-front-matter')

tap.test('get front matter and body stream', async (t) => {
  const file = path.join(__dirname, 'data', 'oyaml-front-matter.txt')
  const { frontMatter, bodyStream } = await oyamlFrontMatter(fs.createReadStream(file, 'utf8'))
  t.same(frontMatter, { 'last-sync': 'some-timestamp' })
  const firstLine = bodyStream.read()
  t.same(firstLine, { id: 1, message: 'hi' })
  t.done()
})

tap.test('get front matter and body stream', async (t) => {
  const file = path.join(__dirname, 'data', 'oyaml-no-front-matter.txt')
  const { frontMatter, bodyStream } = await oyamlFrontMatter(fs.createReadStream(file, 'utf8'))
  t.same(frontMatter, {})
  const firstLine = bodyStream.read()
  t.same(firstLine, { id: 1, message: 'hi' })
  t.done()
})