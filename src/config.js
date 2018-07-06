const path = require('path')
const userHome = require('user-home')
const fs = require('fs')
const oyaml = require('oyaml')

const loadConfig = function(configPath) {
  try {
    return oyaml.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (err) {
    console.error(err)
    return {}
  }
}

const loadUserConfig = function() {
  return loadConfig(path.join(userHome, '.route-earth'))
}

const loadLocalConfig = function(configPath) {
  if (!configPath) configPath = path.resolve(process.cwd(), '.hub')
  return loadConfig(configPath)
}

module.exports = {
  loadUserConfig,
  loadLocalConfig
}