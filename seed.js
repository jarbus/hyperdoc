import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import readline from 'readline'

readline.emitKeypressEvents(process.stdin);

process.stdin.setRawMode(true);
process.stdin.resume();




const store = new Corestore('./seed-store')
const swarm = new Hyperswarm()

// Setup corestore replication
swarm.on('connection', function (connection){
    connection.on('data', function (data) {
        // console.log("Peer said:", data.toString())
        // check if data starts with [peer]
        if (data.toString().startsWith("[peer]")) {
            core.append(data.toString())
            console.error('[seed] UPDATE EDITOR HERE')
        }
        // core.append(data)
    })
    store.replicate(connection)
})

// Load a core by name
const core = store.get({ name: 'seeding-core' })

// Make sure the length is loaded
await core.ready()

// Join the Hypercore discoveryKey (a hash of it's public key)
swarm.join(core.discoveryKey)

// Insert 10000 blocks
while (core.length < 10000) {
  await core.append(Buffer.from('the next block of data. #' + core.length))
}

console.log("In another terminal, run:")
console.log("node peer.js "+core.key.toString('hex'))


process.stdin.on('keypress', (ch, key) => {
  // console.log('got "keypress"', ch, key);
  core.append(Buffer.from('the next block of data. #' + core.length))
  if (key && key.ctrl && key.name == 'c') {
    console.log('ctrl+c was pressed');
    process.exit(0);
    // do something usefull
  }
});
