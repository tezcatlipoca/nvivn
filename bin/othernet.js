#!/usr/bin/env node

const debug = require('debug')('othernet:cli')
const config = require('../src/config')
const FileHub = require('../src/hub/file')
const oyaml = require('oyaml')
require('colors')

const hubConfig = config.loadLocalConfig()
const userConfig = config.loadUserConfig()

const hub = new FileHub(hubConfig)

const argv = process.argv.slice(2)
const cmd = argv.join(' ')

const colorize = function(oyamlString) {
  const [main, ...rest] = oyaml.parts(oyamlString)
  return `${main} ${'|'.gray} ${rest.join(' | ').gray}`
}

const cmdOpts = oyaml.parse(oyaml.parts(cmd)[0])
hub.command(cmd).then(lines => {
  if (lines === '') return console.error("(no output)")
  lines.split("\n").forEach(line => {
    const [response, meta] = oyaml.parts(line)
    const output = [colorize(oyaml.parse(response))]
    if (meta && cmdOpts.showMeta) output.push(meta.yellow)
    console.log(output.join("\n"))
  })
})