#!/usr/bin/env node

const minimist = require('minimist')
const debug = require('debug')('othernet:cli')
const oyaml = require('oyaml')
const fs = require('fs')
const split2 = require('split2')
const config = require('../src/config')
const FileHub = require('../src/hub/file')
const signing = require('../src/signing')
const polo = require('polo')
const multiaddr = require('multiaddr')
const SERVICE_NAME = 'nvivn'

let hubConfig = config.loadLocalConfig(null, { create: true, length: 2 })
const userConfig = config.loadUserConfig()

const hub = new FileHub(hubConfig)

const argv = minimist(process.argv.slice(2), {
  boolean: 'showMeta',
  alias: {
    showMeta: ['m']
  }
})
let cmd = argv._.join(' ')

debug('opts', argv)

if (argv._[0] === 'server') {
  const server = require('../src/server')
  const port = argv.p || 9999

  const services = polo({
    heartbeat: 30*1000 // 30 seconds
  })

  server(hub).listen(port, () => {
    console.log(`server is listening at http://localhost:${port}`)

    const filterPeers = (peers) => {
      // console.log("all peers:", peers)
      const peerNames = Object.keys(peers)//.filter(name => name !== hub.config.id)
      // console.log("getting info for peers:", peerNames)
      // TODO later we can map multiple hosts for a single name
      const flatPeers = peerNames
        .map(n => peers[n][0])
        .filter(p => p.service === SERVICE_NAME)
        .map(p => ({
          name: p.name,
          address: p.address,
          multiaddr: multiaddr.fromNodeAddress({ address: p.host, port: p.port }, p.transport).toString(),
          publicKey: p.publicKey }
        ))
      const self = flatPeers.find(p => p.name === hub.config.id)
      if (self) self.self = true
      return flatPeers
    }

    const updatePeers = (services) => {
      hub.peers = filterPeers(services)
      return hub.peers
    }

    console.log("-- announcing --")
    services.put({
      name: hub.config.id,
      service: SERVICE_NAME,
      transport: 'tcp',
      publicKey: hub.config.publicKey,
      // host:'example.com', // defaults to the network ip of the machine
      port//: 8080          // we are listening on port 8080.
    })
    // console.log("all services:", services.all())

    services.on('up', function(name, service) {
      console.log("new peer:", name)
      console.log("peers now", updatePeers(services.all()))
    });
    services.on('down', function(name, service) {
      console.log(name, "went away")
      console.log("peers now", updatePeers(services.all()))
    });
    console.log("all peers", updatePeers(services.all()))
  })
} else {
  const parsedCmd = oyaml.parse(cmd, { array: true })
  let cmdParts = oyaml.parts(cmd)

  const signIfPossible = function(payload, { id, secretKey }={}) {
    const body = oyaml.parse(payload)
    if (!id) id = body.from || userConfig.id
    if (!secretKey) secretKey = userConfig.secretKey
    if (id && secretKey) {
      const bodyString = oyaml.stringify(body)
      debug("signing", payload)
      const meta = {
        signed: [ { id, signature: signing.sign(payload, secretKey) }]
      }
      return [payload, oyaml.stringify(meta)].join(" | ")
    } else {
      return payload
    }
  }

  if (parsedCmd[0].op === 'create-message') {
    const payload = cmdParts[1]
    cmd = [cmdParts[0], signIfPossible(payload)].join(" | ")
    debug("cmd now", cmd)
  }

  const [input, output] = hub.getCommandStreams()
  output.pipe(process.stdout)
  input.write(cmd)
  if (argv.f) {
    fs.createReadStream(argv.f).pipe(split2()).pipe(input)
  } else {
    input.end()
  }
}
