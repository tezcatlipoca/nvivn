const http = require('http')
const url = require('url')
const split2 = require('split2')
const port = 9999

const server = (hub) => {
  return http.createServer((req, res) => {
    const [input, output] = hub.getCommandStreams()
    const { pathname } = url.parse(req.url, true)
    const cmd = decodeURIComponent(pathname).slice(1).replace(/[+_]/g,' ')
    if (req.method === 'GET') {
      console.log("get command", cmd)
      input.write(cmd)
      output.pipe(res)
      input.end()
    } else {
      console.log("handling method", req.method)
      const splitPipe = split2()
      req.on('end', () => console.log("done reading request"))
      splitPipe.on('end', () => console.log("split done reading"))
      input.write(cmd)
      req.pipe(splitPipe).pipe(input)
      output.pipe(res)
    }
  })
}

if (require.main === module) {
  server.listen(port, () => {
    console.log(`server is listening on ${port}`)
  })
}

module.exports = server
