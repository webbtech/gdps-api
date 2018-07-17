
export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

export function averageArr(array) {
  let sum, avg = 0
  if (!array || !array.length) return null
  sum = array.reduce((a, b) => a + b )
  avg = sum / array.length
  return avg
}

export function numberRange (start, end) {
  end++
  return new Array(end - start).fill().map((d, i) => i + start)
}