import express from 'express'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { Server } from 'socket.io'
import { query, startUpDatabase } from './definitely-not-a-database/database'
import { enqueueShortCodeGenerator } from './short-codes/shortCodeGenerator'

const app = express()
const server = createServer(app)
const socketServer = new Server(server)

app.use(express.static('client'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.post('/url', async (req, res) => {
  const contentType = req.headers['content-type']
  const { url } = req.body

  if (!url) {
    return res.status(400).send('url is a required parameter')
  }

  enqueueShortCodeGenerator(url)

  if (contentType === 'application/json') {
    return res.status(200).json({ message: 'shortening successfully enqueued' })
  } else {
    return res.status(200).sendFile(resolve(__dirname, 'client/index.html'))
  }
})

app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params

  const data = await query('completed', shortCode)

  if (!data) {
    return res.status(404).send('url not found')
  }

  return res.status(200).json({ url: data.original })
})

socketServer.on('connection', (s) => {
  console.log(s)
})

startUpDatabase()
  .then(() => server.listen(3000, () => console.log('Up and running!')))
  .catch((err) => console.error('Failed to launch!', err))
