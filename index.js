const crypto = require("crypto")
const proquint = require("proquint")
const geohash = require('ngeohash')
const base32 = require('base32-encoding')

// const type = Buffer.from([0x01])
// const hub = Buffer.from([0xff, 0xff])
const hub = Buffer.from([0x00, 0x00])
const hubEncoded = proquint.encode(hub);
console.log("hub:", hubEncoded)
const id = crypto.randomBytes(4)
// console.log(type, hub, id)
console.log(hub, id)
// const encoded = proquint.encode(Buffer.concat([type, hub, id]));
// const encoded = proquint.encode(Buffer.concat([hub, id]));
const encoded = proquint.encode(Buffer.concat([id, hub]));
console.log(encoded);

const ghash = geohash.encode(37.749023, -122.422198, 7)
const geoBuffer = base32.parse(ghash)
console.log("geohash", ghash)
// console.log("geobuffer:", geoBuffer)
// const proquintGeo = proquint.encode(geoBuffer)
// console.log(proquintGeo)
// const decodedProquint = proquint.decode(proquintGeo)
// const reconstructedGeoHash = base32.stringify(decodedProquint)
// console.log("reconstructed geohash", reconstructedGeoHash)
// const location = geohash.decode(reconstructedGeoHash)
// console.log(location)