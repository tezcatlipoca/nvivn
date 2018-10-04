const localforage = require('localforage')
const oyaml = require('oyaml')
const multiaddr = require('multiaddr')
const idGenerator = require('../id')
const signing = require('../signing')

const MemoryHub = require('../hub/memory')

module.exports = async function(opts) {

  let config = await localforage.getItem('hubConfig')
  if (!config) {
    config = await idGenerator(3)
    console.log("generated config:", config)
    localforage.setItem('hubConfig', config)
  }
  console.log("loaded config for", config.id)

  let hub = new MemoryHub(Object.assign({ messages: opts.messages }, config))
  window.hub = hub
  let host

  const command = function(cmd) {

    if (cmd.startsWith(':')) {
      // these are internal commands
      const internalCmd = oyaml.parse(cmd.slice(1))
      console.log("running internal command", internalCmd)
      if (internalCmd[0] === 'set-host' || internalCmd[0] === 'set-hub') {
        setHost(internalCmd[1])
      } else if (internalCmd === 'set-host' || internalCmd === 'set-hub') {
        host = null
        opts.onData(`back to local hub`)
        opts.onEnd()
      } else if (internalCmd === 'whoami') {
        try {
          opts.onData(oyaml.stringify({ id: config.id, publicKey: config.publicKey, type: 'identity' }))
        } catch (err) {
          opts.onError("no current user")
        }
        opts.onEnd()
      } else if (internalCmd === 'hub' || internalCmd === 'host') {
        opts.onData(`connected to ${host || 'built in web hub'}`)
        opts.onEnd()
      } else if (internalCmd === 'logout') {
        localforage.removeItem('hubConfig')
        config = null
        opts.onData('logged out')
        opts.onEnd()
      } else if (internalCmd === 'generate-id' || internalCmd[0] === 'generate-id') {
        console.log("generate-id args:", internalCmd[1])
        opts.onData('working...')
        idGenerator(3, internalCmd[1]).then(result => {
          config = result
          console.log("generated config:", config)
          hub = new MemoryHub(config)
          localforage.setItem('hubConfig', config)
          if (opts.onClear) opts.onClear()
          opts.onData(oyaml.stringify({ id: config.id, publicKey: config.publicKey, type: 'identity' }))
          opts.onEnd()
          localforage.setItem('hubConfig', config)
        }).catch(err => {
          opts.onError(err)
        })
      } else {
        opts.onError(`Didn't recognize internal command ${cmd}, ${JSON.stringify(internalCmd)}`)
        opts.onEnd()
      }
      return
    }

    if (!cmd.startsWith('op:')) cmd = 'op:' + cmd

    if (host) {

      const meta = {
        signed: [ { id:config.id, publicKey: config.publicKey, signature: signing.sign(cmd, config.secretKey) }]
      }
      cmd = [cmd, oyaml.stringify(meta)].join(" | ")
      console.log("signed command:", cmd)
      const url = `${host}/${cmd.replace(/ /g,'_')}`
      fetch(url)
        .then(r => r.text())
        .then(text => {
          text.trim().split("\n").forEach(line => opts.onData(line))
          if (opts.onEnd) opts.onEnd()
        })
        .catch(err => {
          console.log("error:", err)
          opts.onError(`Error reaching ${host}: ${err}`)
        })

    } else {
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

  }

  const setHost = (url) => {
    try {
      const maddr = multiaddr(url)
      const m = maddr.toOptions()
      url = `http://${m.host}:${m.port}`
    } catch (err) {
    }
    if (!url.startsWith('http')) url = `http://${url}`
    console.log("setting host to", url)
    // try to reach the host
    fetch(url + '/peers')
      .then(r => {
        console.log("response:", r)
        if (r.status !== 200) {
          opts.onError(`Error reaching ${url}/peers: ${r.status}`)
        } else {
          return r.text()
        }
      })
      .then(body => {
        console.log("got body:", body)
        host = url
        opts.onData(`host now ${host}`)
        opts.onEnd()
      })
      .catch(err => {
        opts.onError(`Error reaching ${url}/peers: ${err}`)
      })
  }

  return { command, setHost }

}

// init()
