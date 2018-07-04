import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

export const typeDef = gql`
  extend type Query {
    fuelPrice(date: Int, stationID: String!): FuelPrice
  }
  type FuelPrice {
    price: Float
  }
`

export const fetchPrice = (date, stationID, db) => {

  const params = {
    TableName: dt.FUEL_PRICE,
    Key: {
        Date: {N: date.toString()},
        StationID: {S: stationID},
    },
    AttributesToGet: [
        'Price',
    ],
  }

  return promisify(callback =>
    db.getItem(params, callback)
  ).then(result => {
    if (undefined === result.Item) return null
    return {
      price: result.Item.Price.N,
    }
  })
}

export const resolvers = {
  Query: {
    fuelPrice: (_, { date, stationID }, { db }) => {
      return fetchPrice(date, stationID, db)
    },
  },
}