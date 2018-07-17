import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'

import { dynamoTables as dt } from '../config/constants'
import { extractSales } from '../utils/dynamoUtils'
import { asyncForEach } from '../utils/utils'
import { fetchFuelPriceWeekAvgRange } from './FuelPrice'
import { fetchStations } from './Station'


export const typeDef = gql`
  extend type Query {
    fuelSaleMonth(date: String!): FuelSalesByPeriod,
  }
  type FuelSalesByPeriod {
    dateStart: Int
    dateEnd: Int
    stationSales: [FuelSaleMonthStation]
    periodSalesTotal: JSON
  }
  type FuelSaleMonthStation {
    stationID: String
    stationName: String
    stationSales: [FuelSales]
    stationPeriodSalesTotal: JSON
  }
  type FuelSales {
    avgFuelPrice: Float
    sales: JSON
    yearWeek: Int
  }
`

export const resolvers = {
  Query: {
    fuelSaleMonth: (_, { date }, { db }) => {
      return fetchFuelSaleMonth(date, db)
    },
  },
  JSON: GraphQLJSON,
}

export const fetchFuelSaleMonth = async (date, db) => {

  const dte = moment(date)
  const startWk = dte.startOf('month').week()
  const endWk = dte.endOf('month').week()

  const yearWeekStart = parseInt(`${dte.year()}${startWk}`, 10)
  const yearWeekEnd = parseInt(`${dte.year()}${endWk}`, 10)

  const stations = await fetchStations(null, db)
  let res = {
    dateStart: yearWeekStart,
    dateEnd: yearWeekEnd,
  }
  let stationSales = []

  await asyncForEach(stations, async station => {

    const fuelPrices = await fetchFuelPriceWeekAvgRange(yearWeekStart, yearWeekEnd, station.id, db)
    let stSales = await fetchFuelSaleWeekByStation(yearWeekStart, yearWeekEnd, station.id, db)

    stSales.forEach(r => {
      r.avgFuelPrice = fuelPrices.prices[r.yearWeek]
    })

    let stationPeriodSalesTotal = aggregateStationSales(stSales)
    stationSales.push({
      stationID:    station.id,
      stationName:  station.name,
      stationSales: stSales,
      stationPeriodSalesTotal,
    })
  })
  res.stationSales = stationSales
  res.periodSalesTotal = aggregatePeriodSales(stationSales)

  return res
}

function fetchFuelSaleWeekByStation(yearWeekStart, yearWeekEnd, stationID, db) {

  let params = {
    IndexName:            'StationDateIndex',
    ProjectionExpression: 'StationID, StationName, Sales, YearWeek, DateStart, DateEnd',
    TableName:            dt.FUEL_SALE_WEEKLY,
    ExpressionAttributeValues: {
      ':stId':      {S: stationID},
      ':yrWkStart': {N: yearWeekStart.toString()},
      ':yrWkEnd':   {N: yearWeekEnd.toString()},
    },
    KeyConditionExpression: 'StationID = :stId',
    FilterExpression: 'YearWeek BETWEEN :yrWkStart AND :yrWkEnd',
  }

  return db.query(params).promise().then(result => {

    if (!result.Items.length) return null

    let res = []
    result.Items.forEach(element => {
      res.push({
        yearWeek: element.YearWeek.N,
        sales:    extractSales(element.Sales.M),
      })
    })

    // console.log('result.ScannedCount for fetchFuelSaleWeekByStation: ', result.ScannedCount)

    return res
  })
}

// todo: refactor both these aggregate functions to use private members and closure
// see: https://medium.freecodecamp.org/why-you-should-give-the-closure-function-another-chance-31253e44cfa0
function aggregateStationSales(sales) {
  let ret = {}
  sales.forEach(sale => {
    for (const s in sale.sales) {
      if (!ret[s]) ret[s] = 0
      ret[s] += sale.sales[s]
    }
  })
  return ret
}

function aggregatePeriodSales(sales) {
  let ret = {}
  sales.forEach(stSale => {
    for (const s in stSale.stationPeriodSalesTotal) {
      if (!ret[s]) ret[s] = 0
      ret[s] += stSale.stationPeriodSalesTotal[s]
    }
  })
  return ret
}
