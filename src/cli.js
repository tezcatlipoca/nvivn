#!/usr/bin/env node

// require('magicli')()
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.hub') })

const FileHub = require('./hub/file')

const hub = new FileHub({ hubId: process.env.ID, publicKey: process.env.PUBLIC_KEY, secretKey: process.env.SECRET_KEY })

module.exports.createHub = function(geo) {
  const { id, keys, message } = hub.createHub({ geo })
  console.log("new id:", id)
  console.log("secret key:", keys.secretKey)
}

module.exports.scanHubs = function() {
  hub.scanHubs()
}

// if (require.main === module) {
  

//   // const { id, keys, message } = hub.createHub({ geo: "San Francisco <9q8ywpy>" })
//   // const { id, keys, message } = hub.createHub()

//   // console.log("new id:", id)
//   // console.log("secret key:", keys.secretKey)
//   // console.log(`announce message:\n${message}`)

//   hub.scanHubs() // TODO run this on some interval
// }