import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { query, remove, startUpAntiDatabase, update } from './definitely-not-a-database/anti-database'
import { enqueueShortCodeGenerator } from './src/shortCodeGenerator'

const app = express()
const server = createServer(app)
const socketServer = new Server(server)

app.use(express.static('client'))
app.use(express.json())

// Shorten urls sent to this endpoint
app.post('/url', async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).send('url is a required parameter')
  }

  // some ok-ish url validation
  try {
    new URL(url)
  } catch (e) {
    return res.status(400).send('url is not formatted properly')
  }

  // this is where the magic happens
  enqueueShortCodeGenerator(url)

  return res.status(200).json({ message: 'shortening successfully enqueued' })
})

// fetch a url via the shortenedURL
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params

  const data = await query('completed', shortCode)

  if (!data) {
    return res.status(404).send('url not found')
  }

  return res.status(200).json({ url: data.original })
})

// handle websocket connections
socketServer.on('connection', (clientSocket) => {
  clientSocket.on('pendingUrlRequest', async (urls: string | string[]) => {
    // join "rooms" relevant to the urls the client is interested in hearing about
    clientSocket.join(urls)

    for (const url of urls) {
      const urlData = await query('pending', url)

      // progress is complete, so we should check for the more preferable state of "completed" to send an event.
      if (urlData?.progress === 1) {
        const completedData = await query('completed', urlData.shortCode)

        if (completedData) {
          clientSocket.emit('completed:insert', completedData)
          // only send the latest most interesting event, in this case "completed" is more interesting than
          // updates to pending state, so if we sent this, then skip the rest of the logic in this iteration.
          continue
        }
      }

      if (urlData) {
        // send current pending state back to client as an update
        clientSocket.emit('pending:update', urlData)
      }
    }
  })

  // store ack in db
  clientSocket.on('ack', async (shortCode: string) => {
    const acked = await update('completed', shortCode, { ack: true })

    // no longer need duplicate pending data
    remove('pending', acked.original)
  })
})

// bootstrap anti-database, and pass a listener to all anti-database events,
// which are sent via WS to the clients that are looking for them
startUpAntiDatabase(({ table, eventType, data }) => {
  socketServer.to(data.original).emit(`${table}:${eventType}`, data)
})
  .then(() => server.listen(3000, () => console.log('Up and running!')))
  .catch((err) => console.error('Failed to launch!', err))
