const crypto = require("crypto")
const proquint = require("proquint")

const id = crypto.randomBytes(2)
console.log(proquint.encode(id), id)