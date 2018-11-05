import { gql } from 'apollo-server'
import moment from 'moment'


import { dynamoTables as dt } from '../config/constants'
import { fetchTank, fetchTankList } from './Tank'

const uuidv4 = require('uuid/v4')

export const typeDef = gql`
  extend type Mutation {
    toggleActive(input: StationTankActiveInput): InsertResult
  }
  extend type Mutation {
    createStationTank(input: StationTankInput): InsertResult
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
  input StationTankInput {
    tankID: String!
    fuelType: String!
    stationID: String!
  }
`

export const resolvers = {
  Mutation: {
    toggleActive: (_, { input }, { docClient }) => toggleStationTankActive(input, docClient),
    createStationTank: (_, { input }, { docClient }) => createStationTank(input, docClient),
  },
  Query: {
    stationTanks: (_, { stationID }, { db }) => fetchActiveStationTanks(stationID, db),
    stationTanksWithList: (_, { stationID }) => ({ stationID }),
  },
  StationTank: {
    tank: ({ tankID }, args, { db }) => fetchTank(tankID, db),
  },
  StationTanksWithList: {
    currentTanks: ({ stationID }, args, { db }) => fetchStationTanks(stationID, db),
    tankList: (_, vars, { db }) => fetchTankList(db),
  },
}

const fetchActiveStationTanks = (stationID, db) => {
  const params = {
    TableName: dt.STATION_TANK,
    IndexName: 'StationIDIndex',
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':active': { BOOL: true },
    },
    FilterExpression: 'Active = :active',
    KeyConditionExpression: 'StationID = :stId',
    ProjectionExpression: 'ID, Active, FuelType, TankID',
  }

  return db.query(params).promise().then((result) => {
    const res = []
    result.Items.forEach((item) => {
      res.push({
        id: item.ID.S,
        fuelType: item.FuelType.S,
        tankID: item.TankID.S,
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
      ':stId': { S: stationID },
    },
    KeyConditionExpression: 'StationID = :stId',
    ProjectionExpression: 'ID, Active, FuelType, TankID',
  }

  return db.query(params).promise().then((result) => {
    const res = []
    result.Items.forEach((item) => {
      res.push({
        id: item.ID.S,
        active: item.Active ? item.Active.BOOL : false,
        fuelType: item.FuelType.S,
        tankID: item.TankID.S,
      })
    })
    return res
  })
}

const toggleStationTankActive = async (input, docClient) => {
  const params = {
    TableName: dt.STATION_TANK,
    Key: {
      ID: input.id,
    },
    UpdateExpression: 'set Active = :a, UpdatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':a': input.active,
      ':updatedAt': moment().valueOf(),
    },
    ReturnValues: 'ALL_NEW',
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

const createStationTank = async (input, docClient) => {
  const params = {
    TableName: dt.STATION_TANK,
    Item: {
      ID: uuidv4(),
      Active: true,
      CreatedAt: moment().valueOf(),
      FuelType: input.fuelType,
      StationID: input.stationID,
      TankID: input.tankID,
    },
  }

  try {
    await docClient.put(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  return {
    ok: 1,
    nModified: 1,
  }
}
