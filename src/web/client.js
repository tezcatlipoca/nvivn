require('babel-polyfill')
const localforage = require('localforage')
const oyaml = require('oyaml')
const idGenerator = require('../id')
const signing = require('../signing')

const MemoryHub = require('../hub/memory')

module.exports = async function(opts) {
  // const config = 'some oyaml config'
  // localforage.setItem('hubConfig', oyaml.parse(config))

  // let messages = `t:"2018-07-06 <1530893028>" id:fujub-jofop-nuvuv from:nuvuv type:person-profile publicKeys:[9Zrzncex867kuWoPkEBKCGGiYYn2j6ni9gJMunnS8mDR] | route:[id:nuvuv t:"2018-07-06 <1530893028>"] signed:[id:nuvuv signature:M8Hz2Pr4GELO/fz8pLeBe8M7mFBh9pTT5pE1oKXa6CSO2pgt3ATCEKmXSCi9MRJ2SOhSjoSkyKrPhcn7bG90BA==] hash:sha256-h1uC8orqXSp4k3SdUyLL5zDHKvq7BjDWM7nPnDt0moI=\n`
  let messages = ''

  // TODO encrypt this with some passphrase? don't like the secret key sitting in the browser
  let config = await localforage.getItem('hubConfig')
  if (!config) {
    config = idGenerator(3)
    console.log("generated config:", config)
    localforage.setItem('hubConfig', config)
  }
  console.log("loaded config for", config.id)

  const hub = new MemoryHub(Object.assign({ messages }, config))
  window.hub = hub

  hub.getCommandStreams()[0].write('op:announce')

  console.log("hub messages:", hub.messages)

  const command = function(cmd) {
    if (!cmd.startsWith('op:')) cmd = 'op:' + cmd
    const meta = {
      signed: [ { id:config.id, publicKey: config.publicKey, signature: signing.sign(cmd, config.secretKey) }]
    }
    cmd = [cmd, oyaml.stringify(meta)].join(" | ")
    // console.log("signed command:", cmd)

    const [input, output] = hub.getCommandStreams()
    input.write(cmd)
    if (opts.onData) output.on('data', opts.onData)
    if (opts.onError) output.on('error', opts.onError)
    if (opts.onEnd) output.on('finish', opts.onEnd)
    input.end()
  }

  return { command }

}

// init()
