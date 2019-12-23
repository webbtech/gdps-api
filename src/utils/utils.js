import Moment from 'moment'
import { extendMoment } from 'moment-range'

const moment = extendMoment(Moment)

/**
 * Returns number from moment
 * @param {moment} mDte - a moment date object
 * @returns {number} - Date formatted as YYYYMMDD
 */
export function momentToNumber(mDte) {
  return Number(mDte.format('YYYYMMDD'))
}

/**
 * Returns a moment object from number
 * @param {number} date - number as YYYYMMDD
 * @returns {moment} - Moment object
 */
export function numberToMoment(date) {
  const dteStr = date.toString()
  const year = dteStr.substring(0, 4)
  const month = dteStr.substring(4, 6)
  const day = dteStr.substring(6)
  const dte = moment().year(year).month(Number(month) - 1).date(day)
  return dte
}

export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

export function averageArr(array) {
  let avg = 0
  if (!array || !array.length) return null
  const sum = array.reduce((a, b) => a + b)
  avg = sum / array.length
  return avg
}

export function numberRange(start, end) {
  end++
  return new Array(end - start).fill().map((d, i) => i + start)
}

export function wkRange(date) {
  // Get the first and last day of the month
  const firstDay = moment(date).startOf('month')
  const endDay = moment(date).endOf('month')

  const dayRange = moment.range(firstDay, endDay)
  const dayRangeAr = Array.from(dayRange.by('day'))
  const weeks = []

  // loop through each date and get the unique week based on the actual year
  dayRangeAr.forEach((d) => {
    const yr = d.endOf('w').year()
    const yrWk = Number(`${yr}${d.week()}`)
    if (!weeks.includes(yrWk)) {
      weeks.push(Number(`${d.year()}${d.week()}`))
    }
  })
  return weeks
}

/**
 * Returns an array of 7 dates of a week
 * @param {number} date - date formatted as YYYYMMDD
 * @returns {Array} Array of dates in a week
 */
export function weekDayRange(date) {
  const dayRange = []
  const dte = numberToMoment(date)
  for (let i = 0; i < 7; i += 1) {
    dayRange.push(Number(dte.day(i).format('YYYYMMDD')))
  }
  return dayRange
}

export function yearWeekStartEnd(date) {
  const startWk = moment(date).startOf('month').week()
  const startYr = moment(date).startOf('month').year()
  const endWk = moment(date).endOf('month').week()
  const endYr = moment(date).endOf('month').endOf('week').year()
  const startWkDte = Number(`${startYr}${startWk}`)
  const endWkDte = Number(`${endYr}${endWk}`)
  return [startWkDte, endWkDte]
}

export function monthStartEnd(date) {
  const startDay = moment(date).startOf('month').startOf('w')
  const endDay = moment(date).endOf('month').endOf('w')
  const startDate = Number(startDay.format('YYYYMMDD'))
  const endDate = Number(endDay.format('YYYYMMDD'))
  return [startDate, endDate]
}

/**
 * Returns and array of start and end dates as numbers
 * @param {number} wkYear - year and month formatted as YYYYMM
 * @returns {Array} Array of start and end dates
 */
export function weekStartEnd(wkYear) {
  const weekYear = wkYear.toString()

  const year = weekYear.substring(0, 4)
  const week = weekYear.substring(4)

  const start = moment().year(year).week(week).startOf('week')
  const end = moment().year(year).week(week).endOf('week')
  const dateStart = momentToNumber(start)
  const dateEnd = momentToNumber(end)
  return [dateStart, dateEnd]
}

export function monthWeekRanges(date) {
  const ranges = wkRange(date).map((wk) => {
    const wkStr = wk.toString()
    const year = wkStr.substring(0, 4)
    const week = wkStr.substring(4)

    const startDate = momentToNumber(
      moment(date)
        .year(year)
        .week(week)
        .startOf('week')
    )
    const endDate = momentToNumber(
      moment(date)
        .year(year)
        .week(week)
        .endOf('week')
    )

    return {
      yearWeek: wkStr,
      startDate,
      endDate,
    }
  })
  return ranges
}

export function setMonths(year) {
  const months = []
  const curYrM = Number(moment().format('YYYYMM'))
  for (let i = 0; i < 12; i++) {
    const dte = Number(moment(new Date(year, i)).format('YYYYMM'))
    if (dte <= curYrM) {
      months.push(dte)
    }
  }
  return months
}
