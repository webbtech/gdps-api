import moment from 'moment'

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

export function setMonths(year) {
  let months = []
  const curYrM = Number(moment().format('YYYYMM'))
  for (let i=0; i < 12; i++) {
    const dte = Number(moment(new Date(year, i)).format('YYYYMM'))
    if (dte <= curYrM) {
      months.push(dte)
    }
  }
  return months
}