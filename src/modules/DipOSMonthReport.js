import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'
import { gql } from 'apollo-server'
import { uniq } from 'lodash'

import { dynamoTables as dt } from '../config/constants'
import { fetchStationTanks } from './StationTank'


export const typeDef = gql`
  extend type Query {
    dipOSMonthReport(date: String!, stationID: String!): DipOSMonthReport
  }
  type DipOSMonthReport {
    stationID: String
    fuelTypes: JSON
    period: String
    overShort: [OS]
    overShortSummary: JSON
  }
  type OS {
    date: Int
    data: JSON
  }
`

export const resolvers = {
  Query: {
    dipOSMonthReport: (_, { date, stationID }, { db }) => fetchDipOSMonth(date, stationID, db),
  },
  JSON: GraphQLJSON,
}

export const fetchDipOSMonth = async (date, stationID, db) => {
  const dte = moment(date.toString())
  const startDay = dte.startOf('month').format('YYYYMMDD')
  const endDay = dte.endOf('month').format('YYYYMMDD')

  const tanks = await fetchStationTanks(stationID, db)
  const fuelTypes = uniq(tanks.map(t => t.fuelType))

  const res = {
    stationID,
    fuelTypes,
    period: date,
    overShort: [],
    overShortSummary: {},
  }

  const params = {
    TableName: dt.DIP_OVERSHORT,
    ProjectionExpression: '#dte, OverShort',
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':startDay': { N: startDay },
      ':endDay': { N: endDay },
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :startDay AND :endDay',
  }

  return db.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    result.Items.forEach((ele) => {
      res.overShort.push({
        date: Number(ele.Date.N),
        data: extractOS(ele.OverShort.M, fuelTypes),
      })
    })

    const summary = {}
    fuelTypes.forEach((ft) => {
      summary[ft] = res.overShort.reduce(
        (accum, val) => accum + val.data[ft].overShort, 0.00
      )
    })

    res.overShortSummary = summary

    return res
  })
}

const extractOS = (os, fuelTypes) => {
  const ret = {}
  fuelTypes.forEach((ft) => {
    // Same issue with dropped fuel type addressed here to add a default 'empty' value
    const map = os[ft] ? os[ft].M : {
      FuelType: { S: ft },
      LitresSold: { N: 0.00 },
      OverShort: { N: 0.00 },
      TankLitres: { N: 0 },
    }

    ret[ft] = {
      fuelType: map.FuelType.S,
      litresSold: parseFloat(map.LitresSold.N) || 0.00,
      overShort: parseFloat(map.OverShort.N),
      tankLitres: Number(map.TankLitres.N),
    }
  })
  return ret
}
