const tap = require('tap')
const streamBuffers = require('stream-buffers')
const cacheFile = require('../src/cache-file')

const syncFileData = `---
last-sync: 1531200453
keys:[1,2]
---
type:profile id:1 version:1
type:profile id:2 version:1`

const readStream = new streamBuffers.ReadableStreamBuffer()
readStream.put(syncFileData)

const writeStream = new streamBuffers.WritableStreamBuffer()

tap.test('add to a sync file', async (t) => {
  const c = await cacheFile(readStream, writeStream, { key: 'id' })
  t.same(c.metadata['last-sync'], 1531200453)
  // add a new one
  await c.put({ type: 'profile', id: 3, version: 1 })
  // update an existing one
  await c.put({ type: 'profile', id: 2, version: 2 })
  const now = Math.floor(Date.now()/1000)
  c.setMetadata('last-sync', now)
  t.same(c.metadata['last-sync'], now)
  c.write()
  writeStream.on('finish', () => {
    t.same(writeStream.getContentsAsString('utf8'), `---
    last-sync: ${now}
    keys:[1,2,3]
    ---
    type:profile id:1 version:1
    type:profile id:2 version:2
    type:profile id:3 version:1`)
    t.done()  
  })
})