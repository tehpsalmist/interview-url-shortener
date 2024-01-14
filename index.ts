import express from 'express'
import { createServer } from 'node:http'
import { resolve } from 'node:path'

const app = express()
const server = createServer(app)

app.use(express.static('client'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.post('/url', (req, res) => {
  const contentType = req.headers['content-type']

  if (!req.body.url) {
    res.status(500).send('test failed')
  }

  if (contentType === 'application/json') {
    res.status(200).json({ message: 'test successful' })
  } else {
    res.status(200).sendFile(resolve(__dirname, 'client/index.html'))
  }
})

server.listen(3000)
