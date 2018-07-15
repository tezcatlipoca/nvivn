const tap = require('tap')
const streamBuffers = require('stream-buffers')
const fs = require('fs')
const path = require('path')
const cacheFile = require('../src/cache-file')
const oyamlFrontMatter = require('../src/oyaml-front-matter')
const crypto = require('crypto')

// tap.test('add to a sync file', async function(t) {
//   t.plan(3)
//   const file = path.join(__dirname, 'data', 'cache-file.txt')
//   const readStream = fs.createReadStream(file)
//   const writeStream = new streamBuffers.WritableStreamBuffer()
//   const c = await cacheFile(readStream, writeStream)
//   t.same(c.metadata.synced, 1531200453)
//   // add a new one
//   await c.put({ type: 'profile', id: 3, version: 1 })
//   // update an existing one
//   await c.put({ type: 'profile', id: 2, version: 2 })
//   const now = Math.floor(Date.now()/1000)
//   c.setMetadata('synced', now)
//   t.same(c.metadata.synced, now)
//   await new Promise(resolve => {
//     c.write().on('finish', async () => {
//       const oyamlString = writeStream.getContentsAsString('utf8')
//       console.log("!!!! oyaml string:", oyamlString)
//       t.same(await oyamlFrontMatter.fromString(oyamlString), {
//         frontMatter: {
//           synced: now,
//           keys: [1, 2, 3]
//         },
//         body: [
//           { id:2, type:'profile', version:2 },
//           { id:3, type:'profile', version:1 },
//           { id:1, type:'profile', version:1 }
//         ]
//       })
//       resolve()
//       t.done()
//     })
//   })
// })
//
// // tap.test("still close the write stream if there's nothing to write", async function (t) {
// //   const file = path.join(__dirname, 'data', 'cache-file.txt')
// //   const readStream = fs.createReadStream(file)
// //   const writeStream = new streamBuffers.WritableStreamBuffer()
// //   const c = await cacheFile(readStream, writeStream)
// //   await new Promise(resolve => {
// //     c.write().on('finish', async () => {
// //       const result = writeStream.getContentsAsString('utf8')
// //       const parsed = await oyamlFrontMatter.fromString(result)
// //       const expected = await oyamlFrontMatter.fromString(`---
// // synced:1531200453
// // keys:[1, 2]
// // ---
// // id:1 type:profile version:1
// // id:2 type:profile version:1`)
// //       console.log("expected:", expected)
// //       t.same(parsed, expected)
// //       t.done()
// //     })
// //   })
// // })
//
// tap.test("don't die on an empty file", async function (t) {
//   const file = path.join(__dirname, 'data', 'empty.txt')
//   const emptyStream = fs.createReadStream(file)
//   const writeStream = new streamBuffers.WritableStreamBuffer()
//   const c = await cacheFile(emptyStream, writeStream)
//   t.same(c.metadata, { keys:[] })
//   t.done()
// })

tap.test("check if a key exists", async function(t) {
  const file = path.join(__dirname, 'data', 'cache-file.txt')
  const readStream = fs.createReadStream(file)
  const c = await cacheFile(readStream)
  t.ok(c.maybeExists(1))
  t.ok(c.maybeExists(2))
  t.notOk(c.maybeExists(3))
})

tap.test("check if a key exists using a bloom filter", async function(t) {
  const file = path.join(__dirname, 'data', 'cache-file.txt')
  const readStream = fs.createReadStream(file)
  // const writeStream = new streamBuffers.WritableStreamBuffer()
  const writeStream = fs.createWriteStream('tmp.txt')
  const c = await cacheFile(readStream, writeStream, { bloomFilter: true })
  const ids = []
  for (let i=0; i<10; i++) {
    const id = crypto.randomBytes(4).toString('hex')
    ids.push(id)
    c.put({ id, type:'profile', version:1 })
  }
  console.log("false positive rate is now:", c.rate())
  t.ok(c.maybeExists(ids[0]))
  t.ok(c.maybeExists(ids[1]))
  t.notOk(c.maybeExists('8f985dg8'))
  t.notOk(c.maybeExists(30000))
  t.notOk(c.maybeExists('rip van winkle'))
  const noReallyThough = await c.exists('8f985dg8')
  t.notOk(noReallyThough)
  const start = Date.now()
  c.write()
  const duration = Date.now() - start
  console.log(`wrote file in ${duration} ms`)
})
