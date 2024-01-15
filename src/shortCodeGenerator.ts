import { insert, update } from '../definitely-not-a-database/anti-database'
import { charGenerator, sleep } from './utils'

export const enqueueShortCodeGenerator = (url: string, preExistingCodeChars = '') => {
  // very async
  setTimeout(() => {
    shortCodeGenerator(url, preExistingCodeChars)
  }, 0)
}

// admittedly, this is incredibly overkill, but I had to do something to justify this operation being
// asynchronous to the point it couldn't be returned in the HTTP response 😅
const shortCodeGenerator = async (url: string, preExistingCodeChars = '') => {
  let shortCode = preExistingCodeChars

  // assumes knowledge of the caller's purpose, that this object already exists in the pending table
  // if existing characters were provided.
  if (!preExistingCodeChars) {
    await insert('pending', url, { progress: 0, ack: false, original: url, shortCode })
  }

  // laboriously generate a 10 character code, saving progress to the anti-database at each interval
  for (const char of charGenerator(10 - preExistingCodeChars.length)) {
    await sleep(1000)
    shortCode += char

    await update('pending', url, { progress: shortCode.length / 10, shortCode }).catch(async () => {
      // if for some reason the data didn't already exist, thus erroring, insert it so we can continue generating
      await insert('pending', url, { progress: shortCode.length / 10, ack: false, original: url, shortCode })
    })
  }

  // move the finished product to the completed table, where it is keyed by shortCode
  await insert('completed', shortCode, {
    shortCode,
    original: url,
    progress: 1,
    ack: false,
    shortenedURL: `http://localhost:3000/${shortCode}`,
  })
}
