require('babel-polyfill')
const localforage = require('localforage')
const oyaml = require('oyaml')
const idGenerator = require('../id')
const signing = require('../signing')

const MemoryHub = require('../hub/memory')

module.exports = async function(opts) {

  let config = await localforage.getItem('hubConfig')
  if (!config) {
    config = idGenerator(3)
    console.log("generated config:", config)
    localforage.setItem('hubConfig', config)
  }
  console.log("loaded config for", config.id)

  const hub = new MemoryHub(config)
  window.hub = hub

  const command = function(cmd) {
    if (!cmd.startsWith('op:')) cmd = 'op:' + cmd
    // const meta = {
    //   signed: [ { id:config.id, publicKey: config.publicKey, signature: signing.sign(cmd, config.secretKey) }]
    // }
    // cmd = [cmd, oyaml.stringify(meta)].join(" | ")
    // console.log("signed command:", cmd)

    const [input, output] = hub.getCommandStreams()
    input.write(cmd)
    if (opts.onData) output.on('data', (d) => {
      // ignore the newlines
      if (d.trim() !== '') opts.onData(d)
    })
    if (opts.onError) output.on('error', opts.onError)
    if (opts.onEnd) output.on('finish', opts.onEnd)
    input.end()
  }

  return { command }

}

// init()
