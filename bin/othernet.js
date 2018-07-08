#!/usr/bin/env node

const minimist = require('minimist')
const debug = require('debug')('othernet:cli')
const config = require('../src/config')
const FileHub = require('../src/hub/file')
const oyaml = require('oyaml')
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
const cmd = argv._.join(' ')

debug('opts', argv)

const colorize = function(oyamlString) {
  const [main, ...rest] = oyaml.parts(oyamlString)
  return `${main} ${rest.length > 0 ? '|'.gray : ''} ${rest.join(' | ').gray}`
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