import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'

import { dynamoTables as dt } from '../config/constants'
import { averageArr, monthStartEnd, wkRange } from '../utils/utils'

export const typeDef = gql`
  extend type Query {
    fuelPrice(date: Int, stationID: String!): FuelPrice
    fuelPriceWeekAvg(yearWeek: Int!, stationID: String!): FuelAverage
    fuelPriceWeekAvgRange(date: String!, stationID: String!): FuelAverageRange
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
    fuelPrice: (
      _,
      { date, stationID },
      { db }
    ) => fetchPrice(date, stationID, db),
    fuelPriceWeekAvg: (
      _,
      { yearWeek, stationID },
      { db }
    ) => fetchFuelPriceWeekAvg(yearWeek, stationID, db),
    fuelPriceWeekAvgRange: (
      _,
      { date, stationID },
      { docClient }
    ) => fetchFuelPriceWeekAvgRange(date, stationID, docClient),
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

export const fetchFuelPriceWeekAvgRange = (date, stationID, docClient) => {
  const [dateStart, dateEnd] = monthStartEnd(date)
  const weekRange = wkRange(date)

  const params = {
    TableName: dt.FUEL_PRICE,
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId': stationID,
      ':dateStart': dateStart,
      ':dateEnd': dateEnd,
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dateStart AND :dateEnd',
    ProjectionExpression: 'Price, YearWeek',
  }

  return docClient.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    // Initiate a temporary object for results
    const res = {}
    weekRange.forEach((yw) => { res[yw] = [] })

    result.Items.forEach((element) => {
      weekRange.forEach((yw) => {
        if (element.YearWeek === yw) {
          res[yw].push(parseFloat(element.Price))
        }
      })
    })

    // Set all average prices for each week
    const prices = {}
    weekRange.forEach((yw) => {
      prices[yw] = averageArr(res[yw])
    })

    return {
      dateStart,
      dateEnd,
      prices,
      stationID,
    }
  })
}
