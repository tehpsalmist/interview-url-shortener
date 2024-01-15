export const safeJSONParse = <T = any>(raw: string): [Error | null, T] => {
  try {
    return [null, JSON.parse(raw)]
  } catch (e) {
    return [e, null]
  }
}

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

export function* charGenerator(length: number) {
  let i = 0
  while (i++ < length) {
    yield randomCharacter()
  }
}

const seedString = `0123456789abcdefghijklmnopqrstuvwxyz`
export const randomCharacter = () => {
  const randomNumber = Math.floor(Math.random() * seedString.length)

  return seedString.charAt(randomNumber)
}
