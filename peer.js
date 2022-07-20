import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import readline from 'readline'

readline.emitKeypressEvents(process.stdin);

process.stdin.setRawMode(true);
process.stdin.resume();

const store = new Corestore('./peer-store')
const swarm = new Hyperswarm()

// Setup corestore replication
swarm.on('connection', function (connection) {
    store.replicate(connection)
    connection.write("[peer] hello")
    process.stdin.on('keypress', (ch, key) => {
      console.log('got "keypress"', ch, key);
      console.log(core)
      connection.write("[peer] hello")
      if (key && key.ctrl && key.name == 'c') {
        console.log('ctrl+c was pressed');
        process.exit(0);
        // do something usefull
      }
    })
})

// Load a core by public key
const core = store.get(Buffer.from('df2b46f175021a802cfd02b2f013149c6300b3b0a4c103d7394aacefeb47ab23', 'hex'))

await core.ready()

// Join the Hypercore discoveryKey (a hash of it's public key)
swarm.join(core.discoveryKey)

// Make sure we have all the connections
await swarm.flush()

// Make sure we have the latest length
await core.update()

// Print the length (should print 10000)
console.log('Core length is:', core.length)

