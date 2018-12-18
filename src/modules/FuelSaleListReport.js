import GraphQLJSON from 'graphql-type-json'
import { gql } from 'apollo-server'
import moment from 'moment'

import {
  asyncForEach,
  monthStartEnd,
  monthWeekRanges,
  wkRange,
} from '../utils/utils'
import { dynamoTables as dt } from '../config/constants'
import { fetchFuelPriceWeekAvgRange } from './FuelPrice'
import { fetchStations } from './Station'

export const typeDef = gql`
  extend type Query {
    fuelSaleListReport(date: String!): FuelSaleListReport
  }
  type FuelSaleListReport {
    periodHeader: [PeriodHeader]!
    periodTotals: [PeriodTotal]!
    periodSales: [StationSales]!
    totalsByFuel: FuelSales!
  }
  type StationSales {
    fuelPrices: JSON,
    periods: [Period],
    stationID: String,
    stationName: String
    stationTotal: FuelSales
  }
  type Period {
    dates: JSON,
    fuelSales: FuelSales
  }
  type PeriodHeader {
    yearWeek: String,
    startDate: String,
    endDate: String,
    week: String
  }
  type PeriodTotal {
    period: String,
    NL: Float,
    DSL: Float
  }
  type FuelSales {
    NL: Float,
    DSL: Float
  }
`

export const resolvers = {
  Query: {
    fuelSaleListReport: (_, { date }, { db, docClient }) => fetchFuelSalesAll(date, db, docClient),
  },
  JSON: GraphQLJSON,
}

const fetchFuelSalesAll = async (date, db, docClient) => {
  const weekRange = wkRange(date)
  const stations = await fetchStations(null, db)
  const periodSales = []

  let stSales
  await asyncForEach(stations, async (station) => {
    stSales = await fetchStationFuelSales(date, station, docClient)
    if (stSales) {
      periodSales.push(stSales)
    }
  })

  if (!periodSales.length) {
    return null
  }

  // console.log('periodSales: ', periodSales[0].periods)
  const periodTotals = setPeriodTotals(periodSales, weekRange)
  const totalsByFuel = setTotalsByFuel(periodTotals)
  const periodHeader = setWeekPeriods(weekRange)

  return {
    periodHeader,
    // periodOrder: weekRange.map(wk => wk.toString()),
    periodTotals,
    totalsByFuel,
    periodSales,
  }
}

const fetchStationFuelSales = async (date, station, docClient) => {
  const [dateStart, dateEnd] = monthStartEnd(date)
  const weekRange = wkRange(date)
  const ranges = monthWeekRanges(date)

  const params = {
    TableName: dt.FUEL_SALE,
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId': station.id,
      ':dateStart': dateStart,
      ':dateEnd': dateEnd,
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dateStart AND :dateEnd',
    ProjectionExpression: '#dte, StationID, Sales, YearWeek',
  }

  const fuelPrices = await fetchFuelPriceWeekAvgRange(date, station.id, docClient)

  const docs = {}
  weekRange.forEach((yr) => { docs[yr] = [] })

  return docClient.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    const sales = ranges.map((range) => {
      const s = {
        NL: 0.00,
        DSL: 0.00,
      }

      result.Items.forEach((item) => {
        if (item.Date >= range.startDate && item.Date <= range.endDate) {
          s.NL += item.Sales.NL
          s.NL += item.Sales.SNL
          s.DSL += item.Sales.DSL
          s.DSL += item.Sales.CDSL
        }
      })
      return {
        dates: range,
        fuelSales: s,
      }
    })

    const stationTotal = {
      NL: sales.reduce((accum, val) => accum + parseFloat(val.fuelSales.NL), 0),
      DSL: sales.reduce((accum, val) => accum + parseFloat(val.fuelSales.DSL), 0),
    }

    const res = {
      fuelPrices,
      periods: sales,
      stationID: station.id,
      stationName: station.name,
      stationTotal,
    }

    return res
  })
}

const setTotalsByFuel = (periodTotals) => {
  const ret = {
    NL: 0,
    DSL: 0,
  }
  Object.keys(periodTotals).forEach((p) => {
    ret.NL += periodTotals[p].NL
    ret.DSL += periodTotals[p].DSL
  })
  return ret
}

const setDates = (yearWeek) => {
  const year = yearWeek.toString().substring(0, 4)
  const week = yearWeek.toString().substring(4)
  const stDte = moment().year(year).week(week).day(0)
  const edDte = moment().year(year).week(week).day(6)

  return {
    startDate: stDte.format('YYYY-MM-DD'),
    endDate: edDte.format('YYYY-MM-DD'),
    week,
  }
}

const setPeriodTotals = (sales, weekRange) => {
  const ret = []
  weekRange.forEach((wk) => {
    const week = wk.toString()
    const wkObj = {
      period: week,
      NL: 0.00,
      DSL: 0.00,
    }
    sales.forEach((sale) => {
      sale.periods.forEach((period) => {
        if (period.dates.yearWeek === week) {
          wkObj.NL += period.fuelSales.NL
          wkObj.DSL += period.fuelSales.DSL
        }
      })
    })
    ret.push(wkObj)
  })
  return ret
}

const setWeekPeriods = range => (
  range.map(r => ({
    yearWeek: r.toString(),
    ...setDates(r),
  }))
)
