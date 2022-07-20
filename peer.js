import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import readline from 'readline'

readline.emitKeypressEvents(process.stdin);

process.stdin.setRawMode(true);
process.stdin.resume();

const store = new Corestore('./peer-store')
const swarm = new Hyperswarm()
if (!Boolean(process.argv[2])){
    console.error("Please provide a discovery key")
    process.exit(1)
}

// Setup corestore replication
swarm.on('connection', function (connection) {
    console.error('Connected')
    store.replicate(connection, {live: true})
    // HAVE SOME EVENT EMITTER HERE THAT CALLS connection.write
    connection.write("[peer] hello")

    process.stdin.on('keypress', (ch, key) => {
      connection.write("[peer] hi there")
      if (key && key.ctrl && key.name == 'c') {
        console.log('ctrl+c was pressed');
        process.exit(0);
      }

    })
    core.on('append', () => {
        console.error('UPDATE EDITOR HERE')
    })
})

// Load a core by public key
const core = store.get(Buffer.from(process.argv[2], 'hex'))

await core.ready()

// Join the Hypercore discoveryKey (a hash of it's public key)
swarm.join(core.discoveryKey)

// Make sure we have all the connections
await swarm.flush()

// Make sure we have the latest length
await core.update()

// Print the length (should print 10000)
console.log('Core length is:', core.length)
