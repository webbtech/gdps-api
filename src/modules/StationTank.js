import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

import { fetchTank } from './Tank'

export const typeDef = gql`
  extend type Query {
    stationTanks(stationID: String!): [StationTank]
  }
  type StationTank {
    id: String
    fuelType: String
    tankID: String
    tank: Tank
  }
`

export const resolvers = {
  Query: {
    stationTanks: (_, { stationID }, { db }) => {
      return fetchTanks(stationID, db)
    },
  },
  StationTank: {
    tank: ({ tankID }, args, { db }) => {
      return fetchTank(tankID, db)
    },
  },
}

export const fetchTanks = (stationID, db) => {

  const params = {
    TableName: dt.STATION_TANK,
    IndexName: 'StationIDIndex',
    ExpressionAttributeValues: {
      ':stId': {S: stationID},
    },
    KeyConditionExpression: 'StationID = :stId',
    ProjectionExpression: 'ID, FuelType, TankID',
  }

  return db.query(params).promise().then(result => {
    // console.log('result.ScannedCount for fetchTanks: ', result.ScannedCount)
    let res = []
    result.Items.forEach(element => {
      res.push({
        id:       element.ID.S,
        fuelType: element.FuelType.S,
        tankID:   element.TankID.S,
      })
    })
    return res
  })
}
