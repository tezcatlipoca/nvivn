'use strict';

const tap = require('tap')
const path = require('path')
const fs = require('fs')
const oyamlFrontMatter = require('../src/oyaml-front-matter')
const { Readable } = require('stream')

tap.test('get front matter and body stream', async function(t) {
  const file = path.join(__dirname, 'data', 'oyaml-front-matter.txt')
  const { frontMatter, bodyStream } = await oyamlFrontMatter.fromStream(fs.createReadStream(file, 'utf8'))
  t.same(frontMatter, { 'last-sync': 'some-timestamp' })
  const data = []
  bodyStream.on('data', obj => {
    console.log("!! got data:", obj, typeof data)
    data.push(obj)
  })
  await new Promise((resolve) => {
    bodyStream.on('end', () => {
      console.log("-- all done --")
      t.same(data, [{ id: 1, message: 'hi' }, { id: 2, message: 'there' }])
      t.done()
      resolve()
    })
  })
})

tap.test('works without front matter, too', async function(t) {
  const file = path.join(__dirname, 'data', 'oyaml-no-front-matter.txt')
  const { frontMatter, bodyStream } = await oyamlFrontMatter.fromStream(fs.createReadStream(file, 'utf8'))
  t.same(frontMatter, {})
  const firstLine = bodyStream.read()
  t.same(firstLine, { id: 1, message: 'hi' })
  t.done()
})

tap.test('event on empty buffer end', function(t) {
  t.plan(1)
  // const emptyStream = new streamBuffers.ReadableStreamBuffer()
  const file = path.join(__dirname, 'data', 'empty.txt')
  const emptyStream = fs.createReadStream(file)

  emptyStream.on('data', data => console.log(data))
  emptyStream.on('end', () => {
    t.ok(true)
    t.done()
  })
})

tap.test('work on an empty file', async function (t) {
  t.plan(1)
  const file = path.join(__dirname, 'data', 'empty.txt')
  const emptyStream = fs.createReadStream(file)
  const { frontMatter, bodyStream } = await oyamlFrontMatter.fromStream(emptyStream)

  console.log("bodyStream flowing?", bodyStream.readableFlowing)
  bodyStream.on('data', data => console.log(data))
  console.log("bodyStream flowing now?", bodyStream.readableFlowing)
  bodyStream.on('error', err => console.log("!! err", err))
  await new Promise(resolve => {
    bodyStream.on('end', () => {
      t.ok(true)
      resolve()
    })
  })
  t.done()
})

tap.test('empty buffer read', async function (t) {
  t.plan(2)
  const s = new Readable({
    read(){
      t.ok(true)
      this.push(null)
    }
  })
  s.on('data', data => console.log(data))
  await new Promise(resolve => s.on('end', resolve))
  t.ok(true)
})

tap.test('from string', async function (t) {
  const str = `---
key: value
---
thing:a
thing:b`
  const parsed = await oyamlFrontMatter.fromString(str)
  console.log("!! got parsed object:", parsed)
  t.same(parsed, {
    frontMatter: { key: 'value' },
    body: [ { thing: 'a' }, { thing: 'b' }]
  })
})
