import { gql } from 'apollo-server'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

import { fetchDelivery } from './FuelDeliver'

export const typeDef = gql`
  extend type Query {
    dips(date: Int!, stationID: String!): [Dip]
  }
  type Dip {
    date: Int
    fuelType: String
    level: Int
    litres: Int
    stationTankID: String!
    fuelDelivery: FuelDeliver
  }
`

export const resolvers = {
  Query: {
    dips: (_, { date, stationID }, { db }) => {
      return fetchDips(date, stationID, db)
    },
  },
  Dip: {
    fuelDelivery: ({ date, stationTankID }, args, { db }) => {
      return fetchDelivery(date, stationTankID, db)
    },
  },
}

const fetchDips = (date, stationID, db) => {

  const params = {
    TableName: dt.DIP,
    IndexName: 'StationIDIndex',
    KeyConditionExpression: 'StationID = :stId and #dte = :dte',
    ExpressionAttributeNames: {
        '#dte': 'Date',
        '#level': 'Level',
    },
    ExpressionAttributeValues: {
      ':stId':  {S: stationID},
      ':dte':   {N: date.toString()},
    },
    ProjectionExpression: '#dte, FuelType, #level, Litres, StationTankID',
  }

  return promisify(callback =>
    db.query(params, callback)
  ).then(result => {
    if (result.Items.length <= 0) return null
    let res = []
    result.Items.forEach(element => {
      res.push({
        date:           element.Date.N,
        fuelType:       element.FuelType.S,
        level:          element.Level.N,
        litres:         element.Litres.N,
        stationTankID:  element.StationTankID.S,
      })
    })
    return res
  })
}
