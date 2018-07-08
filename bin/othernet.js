#!/usr/bin/env node

const minimist = require('minimist')
const debug = require('debug')('othernet:cli')
const oyaml = require('oyaml')
const config = require('../src/config')
const FileHub = require('../src/hub/file')
const signing = require('../src/signing')
require('colors')

const hubConfig = config.loadLocalConfig()
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

const colorize = function(oyamlString) {
  const [main, ...rest] = oyaml.parts(oyamlString)
  return `${main} ${rest.length > 0 ? '|'.gray : ''} ${rest.join(' | ').gray}`
}

const parsedCmd = oyaml.parse(cmd, { array: true })
const cmdParts = oyaml.parts(cmd)

const signIfPossible = function(payload, { id, secretKey }={}) {
  const body = oyaml.parse(payload)
  if (!id) id = body.from || userConfig.id
  if (!secretKey) secretKey = userConfig.secretKey
  if (id && secretKey) {
    const bodyString = oyaml.stringify(body)
    const meta = {
      signed: [ { id, signature: signing.sign(payload, secretKey) }]
    }
    return [payload, oyaml.stringify(meta)].join(" | ")
  } else {
    return payload
  }
}

if (parsedCmd[0].cmd === 'create-message') {
  const payload = cmdParts[1]
  cmd = [cmdParts[0], signIfPossible(payload)].join(" | ")
  debug("cmd now", cmd)
}

hub.command(cmd).then(lines => {
  if (lines === '') return
  lines.split("\n").forEach(line => {
    const [response, meta] = oyaml.parts(line)
    const parsedResponse = oyaml.parse(response)
    const output = (typeof parsedResponse === 'string') ? [colorize(parsedResponse)] : [line]
    if (meta && argv.showMeta) output.push(meta.yellow)
    console.log(output.join("\n"))
  })
}).catch(err => console.error(err))