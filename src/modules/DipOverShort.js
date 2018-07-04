import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'

import { dynamoTables as dt } from '../config/constants'
import { promisify } from '../utils/dynamoUtils'

export const typeDef = gql`

  #scalar JSON
  extend type Query {
    dipOverShort(date: Int!, stationID: String!): DipOverShort
    dipOverShortRange(dateFrom: Int!, dateTo: Int!, stationID: String!): [DipOverShort]
  }
  type DipOverShort {
    date: Int
    overShort: JSON
  }
`
export const resolvers = {

  Query: {
    dipOverShort: (_, { date, stationID }, { db }) => {
      return fetchOS(date, stationID, db)
    },
    dipOverShortRange: (_, { dateFrom, dateTo, stationID }, { db }) => {
      return fetchOSRange(dateFrom, dateTo, stationID, db)
    },
  },
  JSON: GraphQLJSON,
}

export const fetchOS = (date, stationID, db) => {

  const params = {
    TableName: dt.DIP_OVERSHORT,
    Key: {
      Date: {N: Date.toString()},
      StationID: {S: stationID},
    },
    AttributesToGet: [
      'OverShort',
    ],
  }

  return promisify(callback =>
    db.getItem(params, callback)
  ).then(result => {

    if (undefined === result.Item) return null
    const overshort = result.Item.OverShort.M

    return {
      overShort: extractOS(overshort),
    }
  })
}

export const fetchOSRange = (dateFrom, dateTo, stationID, db) => {

  const params = {
    TableName: dt.DIP_OVERSHORT,
    ExpressionAttributeNames: {
        '#dte': 'Date',
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dteFrom AND :dteTo',
    ExpressionAttributeValues: {
      ':stId':    {S: stationID},
      ':dteFrom': {N: dateFrom.toString()},
      ':dteTo':   {N: dateTo.toString()},
    },
    ProjectionExpression: '#dte, OverShort',
  }

  return promisify(callback =>
    db.query(params, callback)
  ).then(result => {

    if (!result.Items.length) return null

    let res = []
    result.Items.forEach(element => {
      res.push({
        date: element.Date.N,
        overShort: extractOS(element.OverShort.M),
      })
    })
    return res
  })
}

const extractOS = overshort => {
  let ret = {}
  for (let m in overshort) {
    const ft = overshort[m].M
    ret[m] = {
      fuelType:   ft.fuel_type.S,
      litres:     parseInt(ft.litres.N, 10),
      overshort:  parseFloat(ft.overshort.N),
      sale:       parseFloat(ft.sale.N),
    }
  }
  return ret
}
