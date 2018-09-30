const createClient = require('./client')
const oyaml = require('oyaml')
const bs58 = require('bs58')
const proquint = require('proquint')

// TODO escape this stuff
const renderMessage = (m, opts={}) => {
  let message = m
  try {
    const parsed = oyaml.parse(m, { array: true })
    const [main, ...rest] = m.split(/ ?\| ?/)
    let userId
    if (parsed[1] && parsed[1].signed && parsed[1].signed[0].publicKey) {
      const publicKey = parsed[1].signed[0].publicKey
      const keyBuf = bs58.decode(publicKey)
      userId = proquint.encode(keyBuf.slice(0,6))
    }
    return `<pre class="${parsed[0].type}">${userId ? `<span class="user">${userId}</span>` : ''}${main}<span class="meta"> ${rest.length > 0 ? '|' : ''} ${rest.join(' | ')}</span></pre>`
  } catch (err) {
    return `<pre class="result-message">${m}</pre>`
  }
}

const init = async function() {

  // make a simple form
  let html = `

  <style>
  body {
    font: sans-serif;
    padding: 5px;
  }

  #hubcmd {
    width: 100%;
    margin-bottom: 1em;
  }

  input[type=text], pre {
    font-family: monospace;
    font-size: 1em;
  }
  #result {
    overflow-x: scroll;
    min-height: 4em;
  }

  #result pre {
    margin: 0
  }

  .announce {
    color: green
  }

  .user {
    color: steelblue;
    margin-right: 0.7em;
  }

  .hub {
    color: green;
  }

  .result-message {
    color: #666
  }

  .meta {
    color: #999;
  }
  .error {
    color: #da0000;
  }
  </style>

  <form id="form" autocomplete="off">
  <input type="text" id="hubcmd"></input>
  </form>
  <div id="result"></div>
  `
  document.body.innerHTML += html

  const cmdField = document.getElementById('hubcmd')
  const resultEl = document.getElementById('result')

  cmdField.focus()

  document.getElementById('form').addEventListener('submit', (evt) => {
    evt.preventDefault()
    resultEl.innerHTML = ''
    client.command(cmdField.value)
  })
  const client = await createClient({
    messages: `text:hi | route:[id:tojop-hafoj-sabuz t:"2018-09-29 <1538239969>"] signed:[id:tojop-hafoj-sabuz publicKey:CQNcCZAuRoQQzYtyhj6E7csv2cHzAzGWiQ6Mm823YcDv signature:4dHgaXMakqdDPB79X69iPohYJYyBvE6ZPQRALE1ZGLr9Hzn5FeTkjsTjsj2EKx2mBtvxrFtHTAgReUL2CHww778J] hash:sha256-7dkgjs6hbeAkQzRKkc9NEWxHzPDMGqJLT8J7RqxhZHj5`,
    onData: (d) => {
      resultEl.innerHTML += renderMessage(d)
    },
    onError: (err) => {
      // TODO escape this
      resultEl.innerHTML = `<pre class="error">${err}</pre>`
      console.error(err)
    },
    onEnd: () => console.log("-- done! --")
  })
  window.command = client.command

  // client.setHost('http://localhost:9999')

  client.command('messages')

}

init()