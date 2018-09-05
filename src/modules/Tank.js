import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'

import { dynamoTables as dt } from '../config/constants'

export const typeDef = gql`

  scalar JSON
  extend type Query {
    tank(id: String!): Tank
    tankList: [Tank]
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
    tankList: (_, vars, { db }) => {
      return fetchTankList(db)
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

  return db.getItem(params).promise().then(result => {

    return {
      id:     result.Item.ID.S,
      levels: extractLevels(result.Item.Levels.M),
      size:   result.Item.Size.N,
    }
  })
}

export const fetchTankList = (db) => {

  const params = {
    AttributesToGet: ['ID', 'Levels', 'Size'],
    TableName: dt.TANK,
  }

  return db.scan(params).promise().then(result => {

    let res = []
    result.Items.forEach(ele => {
      extractLevels(ele.Levels.M)
      res.push({
        id:     ele.ID.S,
        levels: extractLevels(ele.Levels.M),
        size:   ele.Size.N,
      })
    })
    return res
  })
}

const extractLevels = levels => {
  let l = {}
  for (let m in levels) {
    const level = levels[m].M
    l[m] = {
      litres: Number(level.litres.N),
      level:  Number(level.level.N),
    }
  }
  return l
}
