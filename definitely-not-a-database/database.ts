import { readFile, writeFile } from 'fs/promises'
import { safeJSONParse } from '../utils'
import { resolve } from 'node:path'

const DATA_PATH = resolve(__dirname, 'data.json')

interface URLData {
  original: string
  shortCode: string
  ack: boolean
  progress: number
}

interface NotADatabase {
  completed: Record<string, URLData>
  pending: Record<string, URLData>
}

type TableName = 'completed' | 'pending'

let notADatabase: NotADatabase

/*
 * All of these functions are async to simulate DB activity, even if they dont need to be.
 */

export const query = async (table: TableName, identifier: string): Promise<URLData | undefined> => {
  return notADatabase[table][identifier]
}

export const insert = async (table: TableName, identifier: string, urlData: URLData) => {
  notADatabase[table][identifier] = urlData

  enqueueDatabaseUpdates()

  return urlData
}

export const update = async (table: TableName, identifier: string, urlData: Partial<URLData>) => {
  const currentData = await query(table, identifier)

  if (!currentData) {
    throw new Error('item not found')
  }

  // overwrite the supplied fields
  const newData = { ...currentData, ...urlData }
  notADatabase[table][identifier] = newData

  enqueueDatabaseUpdates()

  return newData
}

export const remove = async (table: TableName, identifier: string) => {
  const removed = await query(table, identifier)

  notADatabase[table][identifier] = undefined

  enqueueDatabaseUpdates()

  return removed
}

export const startUpDatabase = async (): Promise<Error | null> => {
  const raw = await readFile(DATA_PATH, { encoding: 'utf-8' }).catch((e) => '{}')

  const [err, loadedData] = safeJSONParse<NotADatabase>(raw)

  if (err) {
    console.error(
      'database has been corrupted. delete definitely-not-a-database/data.json, or try to fix it by hand (good luck!).'
    )
    throw err
  }

  let needsHealing = false

  notADatabase = loadedData

  if (!notADatabase) {
    notADatabase = { completed: {}, pending: {} }
    needsHealing = true
  }

  if (!notADatabase.completed) {
    notADatabase.completed = {}
    needsHealing = true
  }

  if (!notADatabase.pending) {
    notADatabase.pending = {}
    needsHealing = true
  }

  if (needsHealing) {
    enqueueDatabaseUpdates()
  }

  return null
}

let isEnqueued = false
function enqueueDatabaseUpdates() {
  if (isEnqueued) return

  isEnqueued = true
  setTimeout(() => {
    // unnecessarily pretty-printing so I can read and debug stuff
    writeFile(DATA_PATH, JSON.stringify(notADatabase, null, 2), { encoding: 'utf-8' })
    isEnqueued = false
  }, 500)
}
