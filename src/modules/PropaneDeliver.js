import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

export const typeDef = gql`
  extend type Query {
    propaneDelivery(date: Int!): PropaneDeliver
  }
  type PropaneDeliver {
    date: Int
    litres: Int
  }
`

export const resolvers = {
  Query: {
    propaneDelivery: (_, { date }, { db }) => {
      return fetchDelivery(date, db)
    },
  },
}

export const fetchDelivery = (date, db) => {

  const params = {
    TableName: dt.PROPANE_DELIVER,
    Key: {
      Date: {N: date.toString()},
    },
    AttributesToGet: [
      'Date', 'Litres',
    ],
  }

  return promisify(callback =>
    db.getItem(params, callback)
  ).then(result => {
    return {
      date: result.Item.Date.N,
      litres: result.Item.Litres.N,
    }
  })
}
