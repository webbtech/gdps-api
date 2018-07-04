import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

// const R = require('ramda')
import { sortBy } from 'lodash'

export const typeDef = gql`
  extend type Query {
    stations: [Station]
  }
  type Station {
    id: String!
    name: String
  }
`

const fetchStations = (args, db) => {
  const params = {
    TableName: dt.STATION,
    AttributesToGet: ['ID', 'Name'],
  }

  return promisify(callback =>
    db.scan(params, callback)
  ).then(result => {
    let res = []
    result.Items.forEach(element => {
      res.push({
        id:   element.ID.S,
        name: element.Name.S,
      })
    })
    return sortBy(res, [s => s.name])
  })
}

export const resolvers = {
  Query: {
    stations: (_, args, { db }) => {
      return fetchStations(args, db)
    },
  },
}
