import GraphQLJSON from 'graphql-type-json'
import { gql } from 'apollo-server'
import moment from 'moment'

import { asyncForEach, numberRange } from '../utils/utils'
import { dynamoTables as dt } from '../config/constants'
import { fetchStations } from './Station'

export const typeDef = gql`
  extend type Query {
    fuelSaleReportAll(date: String!): FuelSaleReport
  }
  type FuelSaleReport {
    periodHeader: JSON
    periodTotals: JSON
    sales: [StationSales]
  }
  type StationSales {
    periods: JSON,
    stationID: String,
    stationName: String
    stationTotal: JSON
  }
`

export const resolvers = {
  Query: {
    fuelSaleReportAll: (_, { date }, { db }) => {
      return fetchFuelSalesAll(date, db)
    },
  },
  JSON: GraphQLJSON,
}

const fetchFuelSalesAll = async (date, db) => {

  const dte = moment(date)
  const startWk = dte.startOf('month').week()
  const endWk = dte.endOf('month').week()
  const yearWeekStart = parseInt(`${dte.year()}${startWk}`, 10)
  const yearWeekEnd = parseInt(`${dte.year()}${endWk}`, 10)

  const stations = await fetchStations(null, db)

  let sales = []
  await asyncForEach(stations, async station => {
    const stSales = await fetchStationFuelSales(yearWeekStart, yearWeekEnd, station, db)
    sales.push(stSales)
  })
  const yrRange = numberRange(yearWeekStart, yearWeekEnd)
  let periodTotals = setPeriodTotals(sales, yrRange)
  let periodHeader = {}
  yrRange.forEach(yr => {
    periodHeader[yr] = setDates(yr)
  })

  return {
    periodHeader,
    periodTotals,
    sales,
  }
}

const fetchStationFuelSales = async (yearWeekStart, yearWeekEnd, station, db) => {

  const params = {
    IndexName:  'StationIDYearWeekIndex',
    TableName:  dt.FUEL_SALE,
    ExpressionAttributeNames: {
        '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId':      {S: station.id},
      ':yrWkStart': {N: yearWeekStart.toString()},
      ':yrWkEnd':   {N: yearWeekEnd.toString()},
    },
    KeyConditionExpression: 'StationID = :stId AND YearWeek BETWEEN :yrWkStart AND :yrWkEnd',
    ProjectionExpression: '#dte, StationID, Sales, YearWeek',
  }

  const yrRange = numberRange(yearWeekStart, yearWeekEnd)

  let docs = {}
  yrRange.forEach(yr => docs[yr] = [])


  return await db.query(params).promise().then(result => {
    if (!result.Items.length) return null

    // Group results by yearWeek
    result.Items.forEach(ele => {
      yrRange.forEach(yrwk => {
        if (yrwk == ele.YearWeek.N) {
          docs[yrwk].push(ele.Sales.M)
        }
      })
    })

    let res = {
      periods: {},
      stationID:    station.id,
      stationName:  station.name,
      stationTotal: {},
    }
    yrRange.forEach(yr => {
      res.periods[yr] = {}
      res.periods[yr]['sales'] = sumSales(docs[yr])
    })
    res.stationTotal = sumStationTotals(res.periods)

    return res
  })
}

const sumStationTotals = periods => {
  let ret = {NL: 0, DSL: 0}
  for (const yr in periods) {
    ret.NL += periods[yr].sales.NL
    ret.DSL += periods[yr].sales.DSL
  }
  return ret
}

const sumSales = sales => {
  let fuels = {
    NL:   sales.reduce((accum, val) => accum + parseFloat(val.NL.N), 0),
    SNL:  sales.reduce((accum, val) => accum + parseFloat(val.SNL.N), 0),
    DSL:  sales.reduce((accum, val) => accum + parseFloat(val.DSL.N), 0),
    CDSL: sales.reduce((accum, val) => accum + parseFloat(val.CDSL.N), 0),
  }

  return {
    NL: fuels.NL + fuels.SNL,
    DSL: fuels.DSL + fuels.CDSL,
  }
}

const setDates = yearWeek => {
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

const setPeriodTotals = (sales, periods) => {
  let ret = {}
  periods.forEach(p => {
    const period = p.toString()
    ret[period] = {NL: 0, DSL: 0}
    sales.forEach(sale => {
      ret[period].NL += sale.periods[period].sales.NL
      ret[period].DSL += sale.periods[period].sales.DSL
    })
  })
  return ret
}
