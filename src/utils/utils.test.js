/* eslint no-undef: "off" */

// To test this file, use:  npm test -- ./utils

import { averageArr, numberRange } from './utils'

describe('averageArr', () => {

  it('return accurate average', () => {
    const vals = [2, 4, 6]
    const avg = averageArr(vals)
    expect(avg).toEqual(4)
  })

  it('returns null', () => {
    const avg = averageArr()
    expect(avg).toBeNull()
  })

  it('return accurate float average', () => {
    const vals = [ 119.6, 119.6, 121.63333333333, 121.63333333333 ]
    const avg = averageArr(vals)
    expect(avg).toEqual(120.616666666665)
  })
})

describe('numberRange', () => {

  it('returns accurate range', () => {
    const start = 2
    const end = 10
    const range = numberRange(start, end)
    expect(range).toHaveLength(9)
  })

  it('return null value', () => {
    const start = 0
    const end = null
    const range = numberRange(start, end)
    expect(range).toEqual([0])
  })
})