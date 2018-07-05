const encode = function({ label, value }) {
  if (label) {
    return `${label} <${value}>`
  } else {
    return value
  }
}

const decode = function(str) {
  const match = str.match(/([^<]+) <([^>]+)>/)
  if (match) {
    return {
      label: match[1],
      value: match[2]
    }
  } else {
    return { value: str }
  }
  return match ? match[1] : str
}

const getValue = function(str) {
  return decode(str).value
}

module.exports = {
  encode,
  decode,
  getValue
}

if (require.main === module) {
  console.log(encode({ label: "jk", value: "jesse@jklabs.net"}))
  console.log(encode({ value: "somebody@example"}))
  console.log(decode('jk <jesse@jklabs.net>'))
  console.log(getValue('jk <jesse@jklabs.net>'))
}