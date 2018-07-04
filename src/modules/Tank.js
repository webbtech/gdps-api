import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

export const typeDef = gql`

  scalar JSON
  extend type Query {
    tank(id: String!): Tank
  }
  type Tank {
    id: String
    levels: JSON
    size: Int
  }
  type Level {
    level: String
  }
`

export const resolvers = {
  Query: {
    tank: (_, { id }, { db }) => {
      return fetchTank(id, db)
    },
  },
  JSON: GraphQLJSON,
}

export const fetchTank = (id, db) => {
  const params = {
    TableName: dt.TANK,
    Key: {
      'ID': {S: id},
    },
    ProjectionExpression: 'ID, Levels, Size',
  }
  return promisify(callback =>
    db.getItem(params, callback)
  ).then(result => {

    let l = {}
    const levels = result.Item.Levels.M
    for (let m in levels) {
      const level = levels[m].M
      l[m] = {
        litres: parseInt(level.litres.N, 10),
        level:  parseInt(level.level.N, 10),
      }
    }
    return {
      id:     result.Item.ID.S,
      levels: l,
      size:   result.Item.Size.N,
    }
  })
}
