const http = require('http')
const url = require('url')
const split2 = require('split2')
const port = 9999

const server = (hub) => {
  return http.createServer((req, res) => {
    const commandStream = hub.getCommandStream()
    if (req.method === 'GET') {
      const { pathname } = url.parse(req.url, true)
      const cmd = pathname.slice(1).replace(/[+_]/g,' ')
      console.log("get command", cmd)
      commandStream.write(cmd)
      commandStream.end()
      commandStream.pipe(res)
    } else {
      const splitPipe = split2()
      req.on('end', () => console.log("done reading request"))
      splitPipe.on('end', () => console.log("split done reading"))
      commandStream.on('end', () => console.log("command stream done"))
      req.pipe(splitPipe).pipe(commandStream).pipe(res)
    }
  })
}

if (require.main === module) {
  server.listen(port, () => {
    console.log(`server is listening on ${port}`)
  })  
}

module.exports = server