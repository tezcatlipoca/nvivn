const createClient = require('./client')

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
  }

  input[type=text], pre {
    font-family: monospace;
    font-size: 1em;
  }
  #result {
    overflow-x: scroll;
    min-height: 4em;
  }
  </style>

  <form id="form" autocomplete="off">
  <input type="text" id="hubcmd"></input>
  </form>
  <pre id="result"></pre>
  `
  document.body.innerHTML += html

  const cmdField = document.getElementById('hubcmd')
  const resultEl = document.getElementById('result')

  document.getElementById('form').addEventListener('submit', (evt) => {
    evt.preventDefault()
    console.log("form submitted")
    console.log(cmdField.value)
    client.command(cmdField.value)
  })
  let clearOnData = false
  const client = await createClient({
    onData: (d) => {
      console.log(d)
      if (clearOnData) {
        resultEl.innerHTML = ''
        clearOnData = false
      }
      resultEl.innerHTML += d
    },
    onError: (err) => console.error(err),
    onEnd: () => {
      console.log("-- done! --")
      clearOnData = true
    }
  })
  window.command = client.command

}

init()