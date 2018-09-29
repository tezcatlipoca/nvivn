const http = require('http')
const url = require('url')
const split2 = require('split2')
const port = 9999
const oyaml = require('oyaml')
const signatures = require('sodium-signatures')
const bs58 = require('bs58')

const adminCommands = ['announce']

const server = (hub) => {

  const checkAdmin = (cmd) => {
    if (!adminCommands.includes(cmd)) return true
    const parsedCmd = oyaml.parse(cmd, { array: true })
    const meta = parsedCmd[1]
    const signed = meta && meta.signed[0]
    if (signed && signed.publicKey && hub.config.admins && hub.config.admins.includes(signed.publicKey)) {
      const rawCmd = cmd.split('|')[0].trim()
      return signatures.verify(Buffer.from(rawCmd), bs58.decode(signed.signature), bs58.decode(signed.publicKey))
    }
    return false
  }

  return http.createServer((req, res) => {
    const [input, output] = hub.getCommandStreams()
    const { pathname } = url.parse(req.url, true)
    let cmd = decodeURIComponent(pathname).slice(1).replace(/[+_]/g,' ')
    const commandAllowed = checkAdmin(cmd)

    res.setHeader('Access-Control-Allow-Origin', '*')

    if (!commandAllowed) {
      res.writeHead(401)
      return res.end()
    }

    if (!cmd.startsWith('op:')) cmd = 'op:' + cmd
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
