import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { fetchDelivery, persistDelivery, removeDelivery } from './FuelDeliver'
import { asyncForEach } from '../utils/utils'
import { persistDipOS } from './DipOverShort'

export const typeDef = gql`
  extend type Mutation {
    createDips(input: [DipInput]): InsertResult
  }
  extend type Query {
    dips(date: Int!, stationID: String!): [Dip]
    dipsRange(dateFrom: Int!, dateTo: Int!, stationID: String!): [Dip]
  }
  type Dip {
    date: Int
    fuelDelivery: FuelDeliver
    fuelType: String
    level: Int
    litres: Int
    stationID: String!
    stationTankID: String!
  }
  input DipInput {
    date: Int!
    delivery: Int
    fuelType: String!
    level: Int!
    litres: Int!
    stationID: String!
    stationTankID: String!
  }
  type InsertResult {
    ok: Int
    nModified: Int
  }
`

export const resolvers = {
  Query: {
    dips: (_, { date, stationID }, { db }) => fetchDips(date, stationID, db),
    dipsRange: (_, { dateFrom, dateTo, stationID }, { db }) => fetchDipsRange(dateFrom, dateTo, stationID, db),
  },
  Dip: {
    fuelDelivery: ({ date, stationTankID }, args, { db }) => fetchDelivery(date, stationTankID, db),
  },
  Mutation: {
    createDips: (_, { input }, { db }) => persistDips(input, db),
  },
}

export const fetchDips = (date, stationID, db) => {
  const params = {
    TableName: dt.DIP,
    IndexName: 'StationIDIndex',
    KeyConditionExpression: 'StationID = :stId and #dte = :dte',
    ExpressionAttributeNames: {
      '#dte': 'Date',
      '#level': 'Level',
    },
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':dte': { N: date.toString() },
    },
    ProjectionExpression: '#dte, FuelType, #level, Litres, StationID, StationTankID',
  }

  return db.query(params).promise().then((result) => {
    if (result.Items.length <= 0) return null
    const res = []
    result.Items.forEach((element) => {
      res.push({
        date: element.Date.N,
        fuelType: element.FuelType.S,
        level: element.Level.N,
        litres: element.Litres.N,
        stationID: element.StationID.S,
        stationTankID: element.StationTankID.S,
      })
    })
    return res
  })
}

export const fetchDipsRange = async (dateFrom, dateTo, stationID, db) => {
  const params = {
    TableName: dt.DIP,
    IndexName: 'StationIDIndex',
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dateFrom AND :dateTo',
    ExpressionAttributeNames: {
      '#dte': 'Date',
      '#level': 'Level',
    },
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':dateFrom': { N: dateFrom.toString() },
      ':dateTo': { N: dateTo.toString() },
    },
    ProjectionExpression: '#dte, FuelType, #level, Litres, StationTankID',
  }

  return db.query(params).promise().then((result) => {
    if (result.Items.length <= 0) return null
    const res = []
    result.Items.forEach((element) => {
      res.push({
        date: element.Date.N,
        fuelType: element.FuelType.S,
        level: element.Level.N,
        litres: element.Litres.N,
        stationTankID: element.StationTankID.S,
      })
    })
    return res
  })
}

const persistDips = async (input, db) => {
  if (!input.length > 0) return null

  // Could use batch BatchWriteItem, but not sure that we'd gain anything
  await asyncForEach(input, async (i) => {
    const params = {
      TableName: dt.DIP,
      Item: {
        Date: { N: i.date.toString() },
        FuelType: { S: i.fuelType },
        Level: { N: i.level.toString() },
        Litres: { N: i.litres.toString() },
        StationID: { S: i.stationID },
        StationTankID: { S: i.stationTankID },
      },
    }

    try {
      await db.putItem(params).promise()
    } catch (err) {
      console.log('Error: ', err) // eslint-disable-line
      return err
    }

    // Create delivery
    if (i.delivery) {
      const item = {
        date: i.date,
        fuelType: i.fuelType,
        litres: i.delivery,
        stationID: i.stationID,
        stationTankID: i.stationTankID,
      }
      await persistDelivery(item, db)

    // Delete any deliveries that may have been removed during an edit.
    } else {
      const item = {
        date: i.date,
        stationTankID: i.stationTankID,
      }
      await removeDelivery(item, db)
    }
  })

  // Now create the dip os record
  // as the date and stationID are the same for each dip input, we can safely
  // grab the first one and extract the necessary params
  const params = {
    date: input[0].date,
    stationID: input[0].stationID,
  }

  try {
    await persistDipOS(params, db)
  } catch (err) {
    console.log('err: ', err) // eslint-disable-line
    return err
  }

  return {
    ok: 1,
    nModified: input.length,
  }
}
