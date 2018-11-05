import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'

import { dynamoTables as dt } from '../config/constants'
import { averageArr, numberRange } from '../utils/utils'

export const typeDef = gql`
  extend type Query {
    fuelPrice(date: Int, stationID: String!): FuelPrice
    fuelPriceWeekAvg(yearWeek: Int!, stationID: String!): FuelAverage
    fuelPriceWeekAvgRange(yearWeekStart: Int!, yearWeekEnd: Int!, stationID: String!): FuelAverageRange
  }
  type FuelPrice {
    date: Int
    price: Float
    stationID: String
    yearWeek: Int
  }
  type FuelAverage {
    price: Float
    stationID: String
    yearWeek: Int
  }
  type FuelAverageRange {
    dateStart: Int
    dateEnd: Int
    prices: JSON
    stationID: String
  }
`
export const resolvers = {
  Query: {
    fuelPrice: (_, { date, stationID }, { db }) => fetchPrice(date, stationID, db),
    fuelPriceWeekAvg: (_, { yearWeek, stationID }, { db }) => fetchFuelPriceWeekAvg(yearWeek, stationID, db),
    fuelPriceWeekAvgRange: (_, { yearWeekStart, yearWeekEnd, stationID }, { db }) => fetchFuelPriceWeekAvgRange(yearWeekStart, yearWeekEnd, stationID, db),
  },
  JSON: GraphQLJSON,
}

export const fetchPrice = (date, stationID, db) => {
  const params = {
    TableName: dt.FUEL_PRICE,
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    Key: {
      Date: { N: date.toString() },
      StationID: { S: stationID },
    },
    ProjectionExpression: '#dte, Price, StationID, YearWeek',
  }

  return db.getItem(params).promise().then((result) => {
    if (undefined === result.Item) return null
    return {
      date: result.Item.Date.N,
      price: result.Item.Price.N,
      stationID: result.Item.StationID.S,
      yearWeek: result.Item.YearWeek.N,
    }
  })
}

export const fetchFuelPriceWeekAvg = (yearWeek, stationID, db) => {
  const params = {
    ProjectionExpression: 'Price',
    TableName: dt.FUEL_PRICE,
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':yrWk': { N: yearWeek.toString() },
    },
    KeyConditionExpression: 'StationID = :stId',
    FilterExpression: 'YearWeek = :yrWk',
  }

  return db.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    const res = []
    result.Items.forEach((element) => {
      res.push(parseFloat(element.Price.N))
    })

    return {
      price: averageArr(res),
      stationID,
      yearWeek,
    }
  })
}

export const fetchFuelPriceWeekAvgRange = (yearWeekStart, yearWeekEnd, stationID, db) => {
  const params = {
    TableName: dt.FUEL_PRICE,
    IndexName: 'StationIDYearWeekIndex',
    ProjectionExpression: 'Price, YearWeek',
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':yrWkSt': { N: yearWeekStart.toString() },
      ':yrWkEd': { N: yearWeekEnd.toString() },
    },
    KeyConditionExpression: 'StationID = :stId AND YearWeek BETWEEN :yrWkSt AND :yrWkEd',
  }

  const range = numberRange(yearWeekStart, yearWeekEnd)
  return db.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    // Initiate a temporary object for results
    const res = {}
    range.forEach((yw) => {
      res[yw] = []
    })

    result.Items.forEach((element) => {
      range.forEach((yw) => {
        if (element.YearWeek.N == yw) {
          res[yw].push(parseFloat(element.Price.N))
        }
      })
    })

    // Set all average prices for each week
    const prices = {}
    range.forEach((yw) => {
      prices[yw] = averageArr(res[yw])
    })

    return {
      dateStart: yearWeekStart,
      dateEnd: yearWeekEnd,
      prices,
      stationID,
    }
  })
}
