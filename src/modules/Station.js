import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
// import { promisify } from '../utils/dynamoUtils'

// const R = require('ramda')
import { sortBy } from 'lodash'

export const typeDef = gql`
  extend type Query {
    stations: [Station]
    station(stationID: String!): Station
  }
  type Station {
    id: String!
    name: String
  }
`

export const resolvers = {
  Query: {
    stations: (_, args, { db }) => {
      return fetchStations(args, db)
    },
    station: (_, { stationID }, { db }) => {
      return fetchStation(stationID, db)
    },
  },
}

export const fetchStations = (args, db) => {
  const params = {
    TableName: dt.STATION,
    AttributesToGet: ['ID', 'Name'],
  }

  return db.scan(params).promise().then(result => {
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

export const fetchStation = (stationID, db) => {

  const params = {
    TableName: dt.STATION,
    Key: {
      ID: {S: stationID},
    },
    AttributesToGet: [
      'ID', 'Name',
    ],
  }

  return db.getItem(params).promise().then(result => {
    if (!result.Item) {
      return null
    }

    return {
      id: result.Item.ID.S,
      name: result.Item.Name.S,
    }
  })
}