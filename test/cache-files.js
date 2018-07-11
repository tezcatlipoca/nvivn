const tap = require('tap')
const streamBuffers = require('stream-buffers')
const fs = require('fs')
const path = require('path')
const cacheFile = require('../src/cache-file')
const oyamlFrontMatter = require('../src/oyaml-front-matter')

const writeStream = new streamBuffers.WritableStreamBuffer()

tap.test('add to a sync file', async function(t) {
  t.plan(3)
  const file = path.join(__dirname, 'data', 'cache-file.txt')
  const readStream = fs.createReadStream(file)
  const c = await cacheFile(readStream, writeStream)
  t.same(c.metadata.synced, 1531200453)
  // add a new one
  await c.put({ type: 'profile', id: 3, version: 1 })
  // update an existing one
  await c.put({ type: 'profile', id: 2, version: 2 })
  const now = Math.floor(Date.now()/1000)
  c.setMetadata('synced', now)
  t.same(c.metadata.synced, now)
  await new Promise(resolve => {
    c.write().on('finish', async () => {
      const oyamlString = writeStream.getContentsAsString('utf8')
      console.log("!!!! oyaml string:", oyamlString)
      t.same(await oyamlFrontMatter.fromString(oyamlString), {
        frontMatter: {
          synced: now,
          keys: [1, 2, 3]
        },
        body: [
          { id:2, type:'profile', version:2 },
          { id:3, type:'profile', version:1 },
          { id:1, type:'profile', version:1 }
        ]
      })
      resolve()
      t.done()
    })
  })
})

// tap.test("still close the write stream if there's nothing to write", async function (t) {
//   const file = path.join(__dirname, 'data', 'cache-file.txt')
//   const readStream = fs.createReadStream(file)
//   const c = await cacheFile(readStream, writeStream)
//   t.plan(1)
//   c.write().on('finish', () => {
//     t.same(writeStream.getContentsAsString('utf8'), `---
//     last-sync: 1531200453
//     keys:[1,2,3]
//     ---
//     type:profile id:1 version:1
//     type:profile id:2 version:2`)
//     t.done()
//   })

// })

// tap.test("don't die on an empty file", async function (t) {
//   const file = path.join(__dirname, 'data', 'empty.txt')
//   const emptyStream = fs.createReadStream(file)
//   const c = await cacheFile(emptyStream, writeStream)
//   console.log(c, c.metadata)
//   t.same(c.metadata, { keys:[] })
//   t.done()
// })
