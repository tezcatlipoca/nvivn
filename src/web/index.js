const steggy = require('steggy')
const geohash = require('ngeohash')
const L = require('leaflet/dist/leaflet')
require('leaflet/dist/leaflet.css')

document.getElementById('app').innerHTML = `
<style>
#map { height: 400px; width:500px; max-width:100%}
</style>
<input type="file" id="files">
<pre id="messages"></pre>
<button id="get-location">Get location</button>
<input type="text" id="location"></a>
<div id="map"></div>
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

// https://stackoverflow.com/questions/13448595/geohash-string-length-and-accuracy
function getPrecision(meters) {
  let geohash_length = Math.floor( Math.log2(5000000/meters) / 2,5 + 1 )
  if (geohash_length > 12) geohash_length = 12
  if (geohash_length < 1) geohash_length = 1
  console.log("recommended length:", geohash_length)
  return geohash_length
}

let boundingPolygon
const locationInput = document.getElementById('location')

function changeHash(evt) {
  plotGeohash(locationInput.value)
}

function plotGeohash(hash) {
  var b = geohash.decode_bbox(hash)
  const [minlat, minlon, maxlat, maxlon] = b
  if (boundingPolygon) map.removeLayer(boundingPolygon)
  boundingPolygon = L.polygon([
    [minlat, minlon],
    [maxlat, minlon],
    [maxlat, maxlon],
    [minlat, maxlon],
    [minlat, minlon]
  ]).addTo(map);
  map.fitBounds(boundingPolygon.getBounds())
  console.log("geohash:", hash)
  locationInput.value = hash
}

function getLocation(evt) {
  if ("geolocation" in navigator) {
    // quick result may be low accuracy
    navigator.geolocation.getCurrentPosition(function(position) {
      console.log("got position:", position)
      const accuracyInMeters = position.coords.accuracy
      const precision = getPrecision(accuracyInMeters)
      const ghash = geohash.encode(position.coords.latitude, position.coords.longitude, precision)
      plotGeohash(ghash)
    }, err => console.error, { enableHighAccuracy : true });
  } else {
    alert("Geolocation isn't supported")
  }
}

var map = L.map('map')
var Stamen_TonerLite = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}', {
	attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	subdomains: 'abcd',
	minZoom: 0,
	maxZoom: 20,
	ext: 'png'
});

var OpenMapSurfer_Roads = L.tileLayer('https://korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}', {
	maxZoom: 19,
	attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

map.setView(new L.LatLng(0, 0),1);
map.addLayer(OpenMapSurfer_Roads);

document.getElementById('files').addEventListener('change', handleFileSelect, false);
locationInput.addEventListener('keyup', changeHash);
document.getElementById('get-location').addEventListener('click', getLocation);