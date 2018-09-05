import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { fetchTank, fetchTankList } from './Tank'

export const typeDef = gql`
  extend type Mutation {
    toggleActive(input: StationTankActiveInput): InsertResult
  }
  extend type Query {
    stationTanks(stationID: String!): [StationTank]
    stationTanksWithList(stationID: String!): StationTanksWithList
  }
  type StationTank {
    id: String
    active: Boolean
    fuelType: String
    tankID: String
    tank: Tank
  }
  type StationTanksWithList {
    currentTanks: [StationTank]
    tankList: [Tank]
  }
  input StationTankActiveInput {
    id: String!
    active: Boolean!
  }
`

export const resolvers = {
  Mutation: {
    toggleActive: (_, { input }, { docClient }) => {
      return toggleStationTankActive(input, docClient)
    },
  },
  Query: {
    stationTanks: (_, { stationID }, { db }) => {
      return fetchActiveStationTanks(stationID, db)
    },
    stationTanksWithList: (_, { stationID }) => {
      return { stationID }
    },
  },
  StationTank: {
    tank: ({ tankID }, args, { db }) => {
      return fetchTank(tankID, db)
    },
  },
  StationTanksWithList: {
    currentTanks: ({ stationID }, args, { db }) => {
      return fetchStationTanks(stationID, db)
    },
    tankList: (_, vars, { db }) => {
      return fetchTankList(db)
    },
  },
}

const fetchActiveStationTanks = (stationID, db) => {

  const params = {
    TableName: dt.STATION_TANK,
    IndexName: 'StationIDIndex',
    ExpressionAttributeValues: {
      ':stId': {S: stationID},
      ':active': {BOOL: true},
    },
    FilterExpression: 'Active = :active',
    KeyConditionExpression: 'StationID = :stId',
    ProjectionExpression: 'ID, Active, FuelType, TankID',
  }

  return db.query(params).promise().then(result => {

    let res = []
    result.Items.forEach(item => {
      res.push({
        id:       item.ID.S,
        fuelType: item.FuelType.S,
        tankID:   item.TankID.S,
      })
    })
    return res
  })
}

export const fetchStationTanks = (stationID, db) => {

  const params = {
    TableName: dt.STATION_TANK,
    IndexName: 'StationIDIndex',
    ExpressionAttributeValues: {
      ':stId': {S: stationID},
    },
    KeyConditionExpression: 'StationID = :stId',
    ProjectionExpression: 'ID, Active, FuelType, TankID',
  }

  return db.query(params).promise().then(result => {

    let res = []
    result.Items.forEach(item => {
      res.push({
        id:       item.ID.S,
        active:   item.Active ? item.Active.BOOL : false,
        fuelType: item.FuelType.S,
        tankID:   item.TankID.S,
      })
    })
    return res
  })
}

const toggleStationTankActive = async (input, docClient) => {

  const params = {
    TableName: dt.STATION_TANK,
    Key: {
      'ID' : input.id,
    },
    UpdateExpression: 'set Active = :a',
    ExpressionAttributeValues: {
      ':a' : input.active,
    },
  }

  try {
    await docClient.update(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  return {
    ok: 1,
    nModified: 1,
  }
}
