const path = require('path')
const userHome = require('user-home')
const fs = require('fs')
const oyaml = require('oyaml')
const idGenerator = require('./id')

const loadConfig = function(configPath) {
  try {
    return oyaml.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (err) {
    return {}
  }
}

const loadUserConfig = function() {
  return loadConfig(path.join(userHome, '.route-earth'))
}

const loadLocalConfig = function(configPath, opts={}) {
  if (!configPath) configPath = path.resolve(process.cwd(), '.hub')
  let config = loadConfig(configPath)
  if (Object.keys(config).length === 0 && opts.create) {
    config = idGenerator(opts.length || 4)
    console.log("writing new config to", configPath)
    fs.writeFileSync(configPath, oyaml.stringify(config))
  }
  return config
}

module.exports = {
  loadUserConfig,
  loadLocalConfig
}