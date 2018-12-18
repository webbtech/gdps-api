import GraphQLJSON from 'graphql-type-json'
import { gql } from 'apollo-server'
import { uniq } from 'lodash'

import { dynamoTables as dt } from '../config/constants'
import { fetchStationTanks } from './StationTank'
import { monthStartEnd, monthWeekRanges, wkRange } from '../utils/utils'

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
    range: JSON
    sales: [Sales]
    totals: JSON
    yearWeek: Int
  }
  type Sales {
    date: Int
    sales: JSON
  }
`

export const resolvers = {
  Query: {
    fuelSaleDetailedReport: (
      _,
      { date, stationID },
      { db, docClient }
    ) => fetchFuelSales(date, stationID, db, docClient),
  },
  JSON: GraphQLJSON,
}

export const fetchFuelSales = async (date, stationID, db, docClient) => {
  const weekRange = wkRange(date)
  const [dateStart, dateEnd] = monthStartEnd(date)
  const ranges = monthWeekRanges(date)

  const tanks = await fetchStationTanks(stationID, db)
  const fuelTypes = uniq(tanks.map(t => t.fuelType))

  // Initialize temp var for processing later
  const docs = {}
  weekRange.forEach((yr) => { docs[yr] = [] })

  // Initialize result object
  const res = {
    stationID,
    fuelTypes,
  }

  const params = {
    TableName: dt.FUEL_SALE,
    ProjectionExpression: '#dte, Sales, StationID, YearWeek',
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId': stationID,
      ':dateStart': dateStart,
      ':dateEnd': dateEnd,
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dateStart AND :dateEnd',
  }

  let ret = []
  return docClient.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    ret = ranges.map((range) => {
      const sales = []

      result.Items.forEach((item) => {
        if (item.Date >= range.startDate && item.Date <= range.endDate) {
          const wkSales = extractSales(item.Sales, fuelTypes)
          sales.push({
            date: item.Date,
            sales: wkSales,
          })
        }
      })
      return {
        range,
        sales,
      }
    })
    // Set totals for each period
    res.weekSales = ret.map(period => ({
      ...period,
      totals: sumSales(period.sales, fuelTypes),
    }))

    return res
  })
}

const extractSales = (sales, fuelTypes) => {
  const ret = {}
  Object.keys(sales).forEach((ft) => {
    if (fuelTypes.indexOf(ft) >= 0) {
      ret[ft] = parseFloat(sales[ft])
    }
  })
  return ret
}

const sumSales = (sales, fuelTypes) => {
  const ret = {}
  fuelTypes.forEach((ft) => { ret[ft] = 0 })
  sales.forEach((s) => {
    Object.keys(ret).forEach((ft) => {
      ret[ft] += s.sales[ft]
    })
  })
  return ret
}
