const steggy = require('steggy')

document.getElementById('app').innerHTML = `
<h1>image test</h1>
<input type="file" id="files">
<pre id="messages"></pre>
`

function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object

  // files is a FileList of File objects. List some properties.
  var output = [];
  for (var i = 0, f; f = files[i]; i++) {
    var fr = new FileReader()
    fr.readAsArrayBuffer(f)
    fr.onload = function () {
      var ab = fr.result
      var buffer = Buffer.from( new Uint8Array(ab) )
      // console.log("array buffer:", ab)
      // const buffer = arrayBufferToBuffer(ab)
      // console.log("buffer:", buffer)
      var messages = steggy.reveal()(buffer, 'utf8')
      console.log("messages:", messages)
      document.getElementById('messages').innerText = messages
    }
  }
  console.log(output.join("\n"))
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);