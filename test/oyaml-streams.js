const tap = require('tap')
const { parse, stringify } = oyamlStream = require('../src/streams/oyaml')

tap.test('convert from oyaml stream-style', t => {
  let result
  const stream = parse()
  stream.on('data', obj => result = obj)
  stream.on('finish', () => {
    t.same(result, { hi: 'there' })
    t.done()
  })
  stream.write('hi: there')
  stream.end()
})

tap.test('convert from oyaml stream-style, force array', t => {
  let result
  const stream = parse({ array: true })
  stream.on('data', obj => result = obj)
  stream.on('finish', () => {
    t.same(result, [{ hi: 'there' }])
    t.done()
  })
  stream.write('hi: there')
  stream.end()
})

tap.test('convert from multiple oyaml objects stream-style', t => {
  const result = []
  const stream = parse()
  stream.on('data', obj => result.push(obj))
  stream.on('finish', () => {
    t.same(result, [{ hi: 'there' }, { second: 'message' }])
    t.done()
  })
  stream.write('hi: there')
  stream.write('second: message')
  stream.end()
})

tap.test('convert to oyaml stream-style', t => {
  let result
  const stream = stringify()
  stream.on('data', str => result = str)
  stream.on('finish', () => {
    t.same(result, 'hi:there')
    t.done()
  })
  stream.write({ hi: 'there' })
  stream.end()
})

tap.test('stringify multiple oyaml objects stream-style', t => {
  const result = []
  const stream = stringify()
  stream.on('data', obj => result.push(obj))
  stream.on('finish', () => {
    t.same(result, ['hi:there', 'second:message'])
    t.done()
  })
  stream.write({ hi: 'there' })
  stream.write({ second: 'message' })
  stream.end()
})

tap.test('return parts as strings', t => {
  let result
  const stream = parse({ parts: true })
  stream.on('data', obj => result = obj)
  stream.on('finish', () => {
    t.same(result.data, [{ hi: 'there' }, { part: 2}])
    t.same(result.parts, ['hi: there', 'part:2'])
    t.done()
  })
  stream.write('hi: there | part:2')
  stream.end()
})

tap.test('convert both ways', t => {
  let result
  const original = { hi: 'there' }
  const inStream = stringify()
  const outStream = inStream.pipe(parse())
  outStream.on('data', obj => result = obj)
  outStream.on('finish', () => {
    t.same(result, original)
    t.done()
  })
  inStream.write(original)
  inStream.end()
})

tap.test('convert both ways the other way', t => {
  let result
  const original = 'hi:there'
  const inStream = parse()
  const outStream = inStream.pipe(stringify())
  outStream.on('data', obj => result = obj)
  outStream.on('finish', () => {
    t.same(result, original)
    t.done()
  })
  inStream.write(original)
  inStream.end()
})