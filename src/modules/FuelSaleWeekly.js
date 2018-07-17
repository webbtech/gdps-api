import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'

import { dynamoTables as dt } from '../config/constants'

export const typeDef = gql`
  extend type Query {
    fuelSaleWeek(yearWeek: Int, stationID: String!): [FuelSaleWeek],
    fuelSaleWeekNmSort(yearWeek: Int!, stationID: String): [FuelSaleWeek],
  }
  type FuelSaleWeek {
    dateStart: Int
    dateEnd: Int
    yearWeek: Int
    sales: JSON
    stationID: String
    stationName: String
  }
`

export const resolvers = {
  Query: {
    fuelSaleWeek: (_, { yearWeek, stationID }, { db }) => {
      return fetchFuelSaleWeek(yearWeek, stationID, db)
    },
    fuelSaleWeekNmSort: (_, { yearWeek, stationID }, { db }) => {
      return fetchFuelSaleWeekNmSort(yearWeek, stationID, db)
    },
  },
  JSON: GraphQLJSON,
}

export const fetchFuelSaleWeek = (yearWeek = null, stationID, db) => {

  let params = {}
  if (yearWeek) {
    params = {
      KeyConditionExpression: 'StationID = :stId AND YearWeek = :yrWk',
      ExpressionAttributeValues: {
        ':stId':  {S: stationID},
        ':yrWk':  {N: yearWeek.toString()},
      },
    }
  } else {
    params = {
      KeyConditionExpression: 'StationID = :stId',
      ExpressionAttributeValues: {
        ':stId':  {S: stationID},
      },
    }
  }
  params.ProjectionExpression = 'StationID, StationName, Sales, YearWeek, DateStart, DateEnd'
  params.TableName = dt.FUEL_SALE_WEEKLY

  return db.query(params).promise().then(result => {

    if (!result.Items.length) return null

    let res = []
    result.Items.forEach(element => {
      res.push({
        dateStart:    element.DateStart.N,
        dateEnd:      element.DateEnd.N,
        yearWeek:     element.YearWeek.N,
        sales:        extractSales(element.Sales.M),
        stationID:    element.StationID.S,
        stationName:  element.StationName.S,
      })
    })
    return res
  })
}

export const fetchFuelSaleWeekNmSort = (yearWeek, stationID = null, db) => {

  let params = {
    IndexName:            'StationNameIndex',
    ProjectionExpression: 'StationID, StationName, Sales, YearWeek, DateStart, DateEnd',
    TableName:            dt.FUEL_SALE_WEEKLY,
  }
  if (stationID) {
    params.KeyConditionExpression = 'StationID = :stId AND YearWeek = :yrWk'
    params.ExpressionAttributeValues = {
      ':stId':  {S: stationID},
      ':yrWk':  {N: yearWeek.toString()},
    }
  } else {
    params.KeyConditionExpression = 'YearWeek = :yrWk'
    params.ExpressionAttributeValues = {
      ':yrWk':  {N: yearWeek.toString()},
    }
  }

  return db.query(params).promise().then(result => {

    if (!result.Items.length) return null

    let res = []
    result.Items.forEach(element => {
      res.push({
        dateStart:    element.DateStart.N,
        dateEnd:      element.DateEnd.N,
        yearWeek:     element.YearWeek.N,
        sales:        extractSales(element.Sales.M),
        stationID:    element.StationID.S,
        stationName:  element.StationName.S,
      })
    })
    return res
  })
}

const extractSales = sales => {
  const ret = {}
  for (const ft in sales) {
    ret[ft] = parseFloat(sales[ft].N)
  }
  return ret
}
