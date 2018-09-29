require('babel-polyfill')
const localforage = require('localforage')
const oyaml = require('oyaml')
const idGenerator = require('../id')

const MemoryHub = require('../hub/memory')
console.log("Hi, I'm a web hub!")

const init = async function() {
  // const config = 'some oyaml config'
  // localforage.setItem('hubConfig', oyaml.parse(config))

  let messages = `t:"2018-07-06 <1530893028>" id:fujub-jofop-nuvuv from:nuvuv type:person-profile publicKeys:[9Zrzncex867kuWoPkEBKCGGiYYn2j6ni9gJMunnS8mDR] | route:[id:nuvuv t:"2018-07-06 <1530893028>"] signed:[id:nuvuv signature:M8Hz2Pr4GELO/fz8pLeBe8M7mFBh9pTT5pE1oKXa6CSO2pgt3ATCEKmXSCi9MRJ2SOhSjoSkyKrPhcn7bG90BA==] hash:sha256-h1uC8orqXSp4k3SdUyLL5zDHKvq7BjDWM7nPnDt0moI=\n`

  // TODO encrypt this with some passphrase? don't like the secret key sitting in the browser
  let config = await localforage.getItem('hubConfig')
  if (!config) {
    config = idGenerator(8)
    console.log("generated config:", config)
    localforage.setItem('hubConfig', config)
  }
  console.log("loaded config for", config.id)

  const hub = new MemoryHub(Object.assign({ messages }, config))
  window.hub = hub

  console.log("hub messages:", hub.messages)

  window.command = function(cmd) {
    const [input, output] = hub.getCommandStreams()
    input.write(cmd)
    output.on('data', console.log)
    output.on('error', console.error)
    output.on('finish', () => console.log("-- done --"))
    input.end()
  }

}

init()
