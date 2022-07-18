#!/usr/bin/env node

import { Client as HyperspaceClient, Server as HyperspaceServer } from "hyperspace"
import Hyperbeam from 'hyperbeam'
import {Transform, Writable} from 'stream'

if (process.argv.includes('-h') || process.argv.includes('--help')) {
  console.error('Usage: hyperbeam [passphrase]')
  console.error('')
  console.error('  Creates a 1-1 end-to-end encrypted network pipe.')
  console.error('  If a passphrase is not supplied, will create a new phrase and begin listening.')
  process.exit(1)
}

let beam
let host = !Boolean(process.argv[2])
try {
  beam = new Hyperbeam(process.argv[2], process.argv.includes('-r'))
} catch (e) {
  if (e.constructor.name === 'PassphraseError') {
    console.error(e.message)
    console.error('(If you are attempting to create a new pipe, do not provide a phrase and hyperbeam will generate one for you.)')
    process.exit(1)
  } else {
    throw e
  }
}

if (beam.announce) {
  console.error('[hyperbeam] Run hyperbeam ' + beam.key + ' to connect')
  console.error('[hyperbeam] To restart this side of the pipe with the same key add -r to the above')

  const server1 = new HyperspaceServer({
    storage: './hyperspace-demo-1',
    host: 'hyperspace-demo-1'
  })
  await server1.ready()

} else {
  console.error('[hyperbeam] Connecting pipe...')

  const server2 = new HyperspaceServer({
    storage: './hyperspace-demo-2',
    host: 'hyperspace-demo-2'
  })
  await server2.ready()
}

beam.on('remote-address', function ({ host, port }) {
  if (!host) console.error('[hyperbeam] Could not detect remote address')
  else console.error('[hyperbeam] Joined the DHT - remote address is ' + host + ':' + port)
})

beam.on('connected', function () {
  console.error('[hyperbeam] Success! Encrypted tunnel established to remote peer')
})

beam.on('error', function (e) {
  console.error('[hyperbeam] Error:', e.message)
  closeASAP()
})

beam.on('end', () => beam.end())

 /// Create the transform stream:
var processData = new Transform({
  decodeStrings: false
});

processData._transform = function(chunk, encoding, done) {
    var data = chunk.toString()
    done(null, data)
    // if (data !== "clear\n") {
    //     done(null, data);
    // }
    // else {
    //     done(null, '\u001B[2J\u001B[0;0f');
    // }
};

if (host) {
  console.log("this is a host")
  var sharedKey = null
  // Create a client that's connected to the "local" peer.
  const localClient = new HyperspaceClient({
    host: 'hyperspace-demo-1'
  })


  // Create a new RemoteCorestore.
  const store = localClient.corestore()

  // Create a fresh Remotehypercore.
  const core = store.get({
    valueEncoding: 'utf-8'
  })

  // Append two blocks to the RemoteHypercore.
  await core.append(['hello', 'world'])

  // Log when the core has any new peers.
  core.on('peer-add', () => {
    console.error('(local) Replicating with a new peer.')
  })

  core.on('append', () => {
    console.error(core)
  })
  // Start seeding the Hypercore on the Hyperswarm network.
  localClient.replicate(core)

  sharedKey = core.key

  const writableStream = new Writable();
  writableStream._write = (chunk, encoding, next) => {
    // console.log(chunk.toString());
    console.error("message received: " + chunk.toString());
    core.append([chunk.toString()]);
    next();
  };
  beam.pipe(writableStream)
  beam.write(core.key)
  console.error(core)
} else {
    // Create a client that's connected to the "remote" peer.
    const remoteClient = new HyperspaceClient({
      host: 'hyperspace-demo-2'
    })

    const store = remoteClient.corestore()
    // Create a fresh Remotehypercore.
    // TODO create remote core once key is received
    const writableStream = new Writable();
    var core = null
    writableStream._write = (chunk, encoding, next) => {
      // console.log(chunk.toString());
      console.error("message received: " + chunk.toString());


      if (core == null) {
        core = store.get({
          key: chunk,
          live: true,
          valueEncoding: 'utf-8'
        })
        console.error("replicating with remote core")
        remoteClient.replicate(core)

        core.on('append', () => {
            console.error(core)
        })
      }
      console.error(core)
      next()
    };

    console.log("this is a client")
    beam.write('clear')
    process.stdin.pipe(beam).pipe(writableStream)

}

// beam.write()
if (typeof process.stdin.unref === 'function') process.stdin.unref()

process.once('SIGINT', () => {
  if (!beam.connected) closeASAP()
  else beam.end()
})

function closeASAP () {
  console.error('[hyperbeam] Shutting down beam...')

  const timeout = setTimeout(() => process.exit(1), 2000)
  beam.destroy()
  beam.on('close', function () {
    clearTimeout(timeout)
  })
}
