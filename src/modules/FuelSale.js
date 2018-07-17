import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

export const typeDef = gql`
  extend type Query {
    fuelSale(date: Int!, stationID: String!): FuelSale,
    fuelSaleRange(dateFrom: Int!, dateTo: Int!, stationID: String!): [FuelSale]
  }
  type FuelSale {
    date: Int
    sales: JSON
    stationID: String
  }
`

export const resolvers = {
  Query: {
    fuelSale: (_, { date, stationID }, { db }) => {
      return fetchFuelSale(date, stationID, db)
    },
    fuelSaleRange: (_, { dateFrom, dateTo, stationID }, { db }) => {
      return fetchFuelSaleRange(dateFrom, dateTo, stationID, db)
    },
  },
  JSON: GraphQLJSON,
}

export const fetchFuelSale = (date, stationID, db) => {

  const params = {
    TableName: dt.FUEL_SALE,
    Key: {
      Date:       {N: date.toString()},
      StationID:  {S: stationID},
    },
    AttributesToGet: [
      'Date',
      'Sales',
      'StationID',
    ],
  }

  return promisify(callback =>
    db.getItem(params, callback)
  ).then(result => {

    if (undefined === result.Item) return null

    return {
      date:       result.Item.Date.N,
      sales:      result.Item.Sales.M,
      stationID:  result.Item.StationID.S,
    }
  })
}

export const fetchFuelSaleRange = (dateFrom, dateTo, stationID, db) => {

  const params = {
    TableName: dt.FUEL_SALE,
    ExpressionAttributeNames: {
        '#dte': 'Date',
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dteFrom AND :dteTo',
    ExpressionAttributeValues: {
      ':stId':    {S: stationID},
      ':dteFrom': {N: dateFrom.toString()},
      ':dteTo':   {N: dateTo.toString()},
    },
    ProjectionExpression: '#dte, Sales',
  }

  return promisify(callback =>
    db.query(params, callback)
  ).then(result => {

    if (!result.Items.length) return null

    let res = []
    result.Items.forEach(element => {
      res.push({
        date:   element.Date.N,
        sales:  element.Sales.M,
      })
    })
    return res
  })
}
