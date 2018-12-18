/* eslint no-undef: "off" */
import moment from 'moment'

// To test this file, use:  npm test -- ./utils --watch

// import { averageArr, numberRange, wkRange } from './utils'
import * as U from './utils'

describe('averageArr', () => {
  it('return accurate average', () => {
    const vals = [2, 4, 6]
    const avg = U.averageArr(vals)
    expect(avg).toEqual(4)
  })

  it('returns null', () => {
    const avg = U.averageArr()
    expect(avg).toBeNull()
  })

  it('return accurate float average', () => {
    const vals = [119.6, 119.6, 121.63333333333, 121.63333333333]
    const avg = U.averageArr(vals)
    expect(avg).toEqual(120.616666666665)
  })
})

describe('numberRange', () => {
  it('returns accurate range', () => {
    const start = 2
    const end = 10
    const range = U.numberRange(start, end)
    expect(range).toHaveLength(9)
  })

  it('return null value', () => {
    const start = 0
    const end = null
    const range = U.numberRange(start, end)
    expect(range).toEqual([0])
  })
})

describe('wkRange', () => {
  it('returns accurate range', () => {
    const ret = [201848, 201849, 201850, 201851, 201852, 20191]
    const date = '2018-12-01'
    const wks = U.wkRange(date)
    expect(wks).toEqual(ret)
  })
})

describe('yearWeekStartEnd', () => {
  it('return start and end week dates', () => {
    const ret = [201848, 20191]
    const date = '2018-12-01'
    const se = U.yearWeekStartEnd(date)
    expect(se).toEqual(ret)
  })
})

describe('monthStartEnd', () => {
  it('returns start and end dates for month', () => {
    const date = '2018-12-01'
    const retStart = 20181125
    const retEnd = 20190105
    const ret = [retStart, retEnd]
    const se = U.monthStartEnd(date)
    expect(se).toEqual(ret)
  })
})

describe('monthWeekRanges', () => {
  it('returns week ranges', () => {
    const date = '2018-12-01'
    const ranges = U.monthWeekRanges(date)
    expect(ranges).toHaveLength(6)
    expect(ranges[0].startDate).toEqual(20181125)
  })
})

describe('weekStartEnd', () => {
  it('returns start and end dates for supplied weekYear number', () => {
    const date = 201851
    const retStart = 20181216
    const retEnd = 20181222
    const ret = [retStart, retEnd]
    const se = U.weekStartEnd(date)
    expect(se).toEqual(ret)
  })
})

describe('numberToMoment', () => {
  it('returns a moment object from number as YYYYMMDD', () => {
    const dateNum = 20181201
    expect(U.numberToMoment(dateNum)).toBeInstanceOf(moment)
    expect(Number(U.numberToMoment(dateNum).format('YYYYMMDD'))).toEqual(dateNum)
  })
})

describe('weekDayRange', () => {
  it('returns array for each day of week', () => {
    const date = 20181201
    const ret = [20181125, 20181126, 20181127, 20181128, 20181129, 20181130, 20181201]
    const res = U.weekDayRange(date)
    expect(res).toHaveLength(7)
    expect(res).toEqual(ret)
  })
})
