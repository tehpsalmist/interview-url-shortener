import { readFile, writeFile } from 'fs/promises'
import { safeJSONParse } from '../src/utils'
import { resolve } from 'node:path'
import { enqueueShortCodeGenerator } from '../src/shortCodeGenerator'

const DATA_PATH = resolve(__dirname, 'data.json')

interface URLData {
  original: string
  shortCode: string
  ack: boolean
  progress: number
  shortenedURL?: string
}

interface AntiDatabase {
  completed: Record<string, URLData>
  pending: Record<string, URLData>
}

type AntiDatabaseListener = (antiDbEvent: {
  table: TableName
  eventType: 'insert' | 'update' | 'remove'
  data: URLData
}) => void

type TableName = 'completed' | 'pending'

let antiDatabase: AntiDatabase
let antiDatabaseListener: AntiDatabaseListener

/*
 * All of these functions are async to simulate DB activity, even if they dont need to be.
 */

export const query = async (table: TableName, identifier: string): Promise<URLData | undefined> => {
  return antiDatabase[table][identifier]
}

export const insert = async (table: TableName, identifier: string, urlData: URLData) => {
  antiDatabase[table][identifier] = urlData

  enqueueAntiDatabaseUpdates()

  antiDatabaseListener({ table, eventType: 'insert', data: urlData })

  return urlData
}

export const update = async (table: TableName, identifier: string, urlData: Partial<URLData>) => {
  const currentData = await query(table, identifier)

  if (!currentData) {
    throw new Error('item not found')
  }

  // overwrite the supplied fields
  const newData = { ...currentData, ...urlData }
  antiDatabase[table][identifier] = newData

  enqueueAntiDatabaseUpdates()

  antiDatabaseListener({ table, eventType: 'update', data: newData })

  return newData
}

export const remove = async (table: TableName, identifier: string) => {
  const removed = await query(table, identifier)

  antiDatabase[table][identifier] = undefined

  enqueueAntiDatabaseUpdates()

  antiDatabaseListener({ table, eventType: 'remove', data: removed })

  return removed
}

// pull all the data from the file (if it exists), heal the data if necessary and possible,
// re-save healthy data if necessary and possible, and return null if everything is cool.
export const startUpAntiDatabase = async (listener: AntiDatabaseListener): Promise<Error | null> => {
  antiDatabaseListener = listener

  const raw = await readFile(DATA_PATH, { encoding: 'utf-8' }).catch((e) => '{}')

  const [err, loadedData] = safeJSONParse<AntiDatabase>(raw)

  if (err) {
    console.error(
      'anti-database has been corrupted. delete definitely-not-a-database/data.json, or try to fix it by hand (good luck!).'
    )
    throw err
  }

  let needsHealing = false

  antiDatabase = loadedData

  if (!antiDatabase) {
    antiDatabase = { completed: {}, pending: {} }
    needsHealing = true
  }

  if (!antiDatabase.completed) {
    antiDatabase.completed = {}
    needsHealing = true
  }

  if (!antiDatabase.pending) {
    antiDatabase.pending = {}
    needsHealing = true
  }

  if (needsHealing) {
    enqueueAntiDatabaseUpdates()
  }

  // recover any interrupted jobs
  Object.keys(antiDatabase.pending).forEach((originalUrl) => {
    const shortCode = antiDatabase.pending[originalUrl]?.shortCode ?? ''

    if (!antiDatabase.completed[shortCode]) {
      enqueueShortCodeGenerator(originalUrl, shortCode)
    }
  })

  return null
}

let isEnqueued = false
function enqueueAntiDatabaseUpdates() {
  if (isEnqueued) return

  isEnqueued = true
  setTimeout(() => {
    // unnecessarily pretty-printing so I can read and debug stuff
    writeFile(DATA_PATH, JSON.stringify(antiDatabase, null, 2), { encoding: 'utf-8' })
    isEnqueued = false
  }, 500)
}
