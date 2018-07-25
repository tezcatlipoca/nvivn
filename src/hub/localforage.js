const debug = require('debug')('othernet:localforagehub')
const localforage = require('localforage')
const memStreams = require('memory-streams')
const readStreamFromString = require('../streams/read-stream-from-string')
const MemoryHub = require('./memory')

class LocalforageHub extends MemoryHub {

  constructor(opts) {
    super(opts)
    this.store = localforage.createInstance({
      name: `${opts.id}-hub-store`
    })
    this.loadCaches().then(() => {
      if (opts.onReady) opts.onReady()
    })
  }

  async loadCaches() {
    await this.loadCache('profileCache')
    await this.loadCache('hubCache')
    await this.loadCache('messages')
  }

  async loadCache(name) {
    this[name] = await this.store.getItem(name)
    debug(name, "now", this[name])
    if (!this[name]) this[name] = ''
  }

  async writeMessage(message) {
    await super.writeMessage(message)
    await this.store.setItem('messages', this.messages)
  }

  getCacheStreams(source) {
    debug("getting cache streams for", source)
    const read = readStreamFromString(this[source])
    const write = new memStreams.WritableStream()
    // call the callback to copy the new value to the original variable
    const callback = () => {
      return new Promise(async (resolve, reject) => {
        debug("setting new value for", source, write.toString())
        this[source] = write.toString()
        this.store.setItem(source, this[source])
      })
    }
    return {
      read,
      write,
      callback
    }
  }


}

module.exports = LocalforageHub
