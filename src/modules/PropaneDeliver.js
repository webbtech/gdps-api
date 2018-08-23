import { gql } from 'apollo-server'
import moment from 'moment'

import { dynamoTables as dt } from '../config/constants'

export const typeDef = gql`
extend type Mutation {
  createPropaneDelivery(input: PropaneDeliverInput): InsertResult
  removePropaneDelivery(input: PropaneRemoveDeliverInput): InsertResult
}
extend type Query {
  propaneDelivery(date: Int!): PropaneDeliver
}
type PropaneDeliver {
  date: Int
  litres: Int
}
input PropaneDeliverInput {
  date: Int!
  litres: Int!
}
input PropaneRemoveDeliverInput {
  date: Int!
}
`

export const resolvers = {
  Query: {
    propaneDelivery: (_, { date }, { db }) => {
      return fetchDelivery(date, db)
    },
  },
  Mutation: {
    createPropaneDelivery: (_, { input }, { db }) => {
      return persistPropaneDelivery(input, db)
    },
    removePropaneDelivery: (_, { input }, { db }) => {
      return deletePropaneDelivery(input, db)
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

  return db.getItem(params).promise().then(result => {
    if (!result.Item) {
      return null
    }
    return {
      date: result.Item.Date.N,
      litres: result.Item.Litres.N,
    }
  })
}

const persistPropaneDelivery = async (input, db) => {

  const year = moment(input.date.toString()).year()
  const params = {
    TableName: dt.PROPANE_DELIVER,
    Item: {
      Date:   {N: input.date.toString()},
      Litres: {N: input.litres.toString()},
      Year: {N: year.toString()},
    },
  }

  try {
    await db.putItem(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
  }

  return {
    ok: 1,
    nModified: 1,
  }
}

const deletePropaneDelivery = async (input, db) => {

  const params = {
    TableName: dt.PROPANE_DELIVER,
    Key: {
      Date:   {N: input.date.toString()},
    },
  }

  try {
    await db.deleteItem(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
  }

  return {
    ok: 1,
    nModified: 1,
  }
}