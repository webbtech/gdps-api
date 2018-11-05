import { gql } from 'apollo-server'

import moment from 'moment'
import { dynamoTables as dt } from '../config/constants'

export const typeDef = gql`
extend type Mutation {
  createDelivery(input: DeliveryInput): InsertResult
}
extend type Query {
  fuelDeliveries(date: Int!, stationID: String!): [FuelDeliver!]
}
type FuelDeliver {
  date: Int
  fuelType: String
  litres: Int
  stationTankID: String
}
input DeliveryInput {
  date: Int!
  fuelType: String!
  litres: Int!
  stationID: String!
  stationTankID: String!
}
`

export const resolvers = {
  Query: {
    fuelDeliveries: (_, { date, stationID }, { db }) => fetchDeliveries(date, stationID, db),
  },
  Mutation: {
    createDelivery: (_, { input }, { db }) => persistDelivery(input, db),
  },
}

export const fetchDeliveries = (date, stationID, db) => {
  const dte = moment(date.toString()).format('YYYYMMDD')
  const params = {
    TableName: dt.FUEL_DELIVER,
    IndexName: 'StationIDIndex',
    KeyConditionExpression: 'StationID = :stId and #dte = :dte',
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':dte': { N: dte },
    },
    ProjectionExpression: '#dte, FuelType, Litres, StationTankID',
  }

  return db.query(params).promise().then((result) => {
    const res = []
    result.Items.forEach((ele) => {
      res.push({
        date: ele.Date.N,
        fuelType: ele.FuelType.S,
        litres: ele.Litres.N,
        stationTankID: ele.StationTankID.S,
      })
    })
    return res
  })
}

export const fetchDelivery = (date, stationTankID, db) => {
  const params = {
    TableName: dt.FUEL_DELIVER,
    KeyConditionExpression: 'StationTankID = :stId and #dte = :dte',
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId': { S: stationTankID },
      ':dte': { N: date.toString() },
    },
    ProjectionExpression: '#dte, FuelType, Litres, StationTankID',
  }

  return db.query(params).promise().then((result) => {
    const item = result.Items[0]
    if (!item) return
    return {
      fuelType: item.FuelType.S,
      litres: item.Litres.N,
      stationTankID: item.StationTankID.S,
    }
  })
}

export const persistDelivery = async (input, db) => {
  const params = {
    TableName: dt.FUEL_DELIVER,
    Item: {
      Date: { N: input.date.toString() },
      FuelType: { S: input.fuelType },
      Litres: { N: input.litres.toString() },
      StationID: { S: input.stationID },
      StationTankID: { S: input.stationTankID },
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

export const removeDelivery = async (input, db) => {
  const params = {
    TableName: dt.FUEL_DELIVER,
    Key: {
      Date: { N: input.date.toString() },
      StationTankID: { S: input.stationTankID },
    },
  }

  try {
    await db.deleteItem(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
  }
}
