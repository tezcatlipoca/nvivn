const tap = require('tap')
const filter = require('../src/streams/filter')

tap.test('filter objects based on mingo', t => {
  const results = []
  const stream = filter({ value: 2 })
  stream.on('data', obj => results.push(obj))
  stream.on('finish', () => {
    t.same(results, [{ value: 2 }])
    t.done()
  })
  stream.write({ value: 1 })
  stream.write({ value: 2 })
  stream.end()
})
