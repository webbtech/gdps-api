import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

export const typeDef = gql`
  extend type Query {
    fuelDeliveries(date: Int, stationID: String): [FuelDeliver!]
  }
  type FuelDeliver {
    date: Int
    fuelType: String
    litres: Int
    stationTankID: String
  }
`

export const resolvers = {
  Query: {
    fuelDeliveries: (_, { date, stationID }, { db }) => {
      return fetchDeliveries(date, stationID, db)
    },
  },
}

export const fetchDeliveries = (date, stationID, db) => {

  const params = {
    TableName: dt.FUEL_DELIVER,
    IndexName: 'StationIDIndex',
    KeyConditionExpression: 'StationID = :stId and #dte = :dte',
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId':  {S: stationID},
      ':dte':   {N: date.toString()},
    },
    ProjectionExpression: '#dte, FuelType, Litres, StationTankID',
  }

  return promisify(callback =>
    db.query(params, callback)
  ).then(result => {
    let res = []
    result.Items.forEach(element => {
      res.push({
        fuelType:       element.FuelType.S,
        litres:         element.Litres.N,
        stationTankID:  element.StationTankID.S,
      })
    })
    return res
  })
}

export const fetchDelivery = (date, stationTankID, db) => {

  const params = {
    TableName: dt.FUEL_DELIVER,
    IndexName: 'StationTankIDIndex',
    KeyConditionExpression: 'StationTankID = :stId and #dte = :dte',
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId':  {S: stationTankID},
      ':dte':   {N: date.toString()},
    },
    ProjectionExpression: '#dte, FuelType, Litres, StationTankID',
  }

  return promisify(callback =>
    db.query(params, callback)
  ).then(result => {
    const item = result.Items[0]
    if (!item) return
    return {
      fuelType:       item.FuelType.S,
      litres:         item.Litres.N,
      stationTankID:  item.StationTankID.S,
    }
  })
}
