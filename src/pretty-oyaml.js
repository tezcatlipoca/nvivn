module.exports = function(str) {
  return str.replace(/\s/g,"\n").replace(/{/g,"{\n").replace(/}/g,"\n}")
}