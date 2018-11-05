import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'
import { gql } from 'apollo-server'
import { sortBy, uniq } from 'lodash'

import { dynamoTables as dt } from '../config/constants'
import { fetchStationTanks } from './StationTank'
import { numberRange } from '../utils/utils'

export const typeDef = gql`
  extend type Query {
    fuelSaleDetailedReport(date: String!, stationID: String!): FuelSaleDetailedReport
  }
  type FuelSaleDetailedReport {
    fuelTypes: [String]
    stationID: String
    weekSales: [Week]
  }
  type Week {
    yearWeek: Int
    sales: [Sales]
    totals: JSON
  }
  type Sales {
    date: Int
    sales: JSON
  }
`

export const resolvers = {
  Query: {
    fuelSaleDetailedReport: (_, { date, stationID }, { db }) => fetchFuelSales(date, stationID, db),
  },
  JSON: GraphQLJSON,
}

export const fetchFuelSales = async (date, stationID, db) => {
  const dte = moment(date.toString())
  const year = dte.year()
  const startWk = dte.startOf('month').week()
  const endWk = dte.endOf('month').week()
  const yearWeekStart = parseInt(`${dte.year()}${startWk}`, 10)
  const yearWeekEnd = parseInt(`${dte.year()}${endWk}`, 10)

  const yrRange = numberRange(startWk, endWk).map(wk => `${year}${wk}`)

  const tanks = await fetchStationTanks(stationID, db)
  const fuelTypes = uniq(tanks.map(t => t.fuelType))

  // Initialize temp var for processing later
  const docs = {}
  yrRange.forEach(yr => docs[yr] = [])

  // Initialize result object
  const res = {
    stationID,
    fuelTypes,
  }

  const params = {
    TableName: dt.FUEL_SALE,
    IndexName: 'StationIDYearWeekIndex',
    ProjectionExpression: '#dte, Sales, StationID, YearWeek',
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':yrWkStart': { N: yearWeekStart.toString() },
      ':yrWkEnd': { N: yearWeekEnd.toString() },
    },
    KeyConditionExpression: 'StationID = :stId AND YearWeek BETWEEN :yrWkStart AND :yrWkEnd',
  }

  return db.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    result.Items.forEach((ele) => {
      yrRange.forEach((yrwk) => {
        if (yrwk == ele.YearWeek.N) {
          docs[yrwk].push({
            date: parseInt(ele.Date.N, 10),
            sales: extractSales(ele.Sales.M, fuelTypes),
          })
        }
      })
    })

    const weekSales = []
    for (const yr in docs) {
      weekSales.push({
        sales: sortBy(docs[yr], [yr => yr.date]),
        totals: sumSales(docs[yr], fuelTypes),
        yearWeek: yr,
      })
    }
    res.weekSales = weekSales

    return res
  })
}

const extractSales = (sales, fuelTypes) => {
  const ret = {}
  for (const ft in sales) {
    if (fuelTypes.indexOf(ft) >= 0) {
      ret[ft] = parseFloat(sales[ft].N)
    }
  }
  return ret
}

const sumSales = (sales, fuelTypes) => {
  const ret = {}
  fuelTypes.forEach(ft => ret[ft] = 0)
  sales.forEach((s) => {
    for (const ft in ret) {
      ret[ft] += s.sales[ft]
    }
  })
  return ret
}
