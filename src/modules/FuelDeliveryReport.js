import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'
import { gql } from 'apollo-server'
import { uniq } from 'lodash'

import { dynamoTables as dt } from '../config/constants'
import { fetchStationTanks } from './StationTank'
import { numberRange } from '../utils/utils'

export const typeDef = gql`
  extend type Query {
    fuelDeliveryReport(date: String!, stationID: String!): FuelDeliverReport
  }
  type FuelDeliverReport {
    fuelTypes: [String]
    deliveries: [FuelDelivery]
    deliverySummary: JSON
  }
  type FuelDelivery {
    data: JSON
    date: Int
  }
`

export const resolvers = {
  Query: {
    fuelDeliveryReport: (_, { date, stationID }, { db }) => fetchFuelDeliveryReport(date, stationID, db),
  },
  JSON: GraphQLJSON,
}

export const fetchFuelDeliveryReport = async (date, stationID, db) => {
  const report = {}

  const dte = moment(date.toString())
  const startDay = dte.startOf('month').format('YYYYMMDD')
  const endDay = dte.endOf('month').format('YYYYMMDD')
  const dayRange = numberRange(Number(startDay), Number(endDay))

  const tanks = await fetchStationTanks(stationID, db)
  report.fuelTypes = uniq(tanks.map(t => t.fuelType))

  const params = {
    IndexName: 'StationIDIndex',
    TableName: dt.FUEL_DELIVER,
    ProjectionExpression: '#dte, FuelType, Litres',
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

    // Aggregate deliveries by day
    const tmpDeliveries = {}
    dayRange.forEach((d) => {
      result.Items.forEach((item) => {
        if (d === Number(item.Date.N)) {
          if (!tmpDeliveries[d]) {
            tmpDeliveries[d] = []
          }
          tmpDeliveries[d].push({
            fuelType: item.FuelType.S,
            litres: item.Litres.N,
          })
        }
      })
    })

    // Create map of deliveries
    const ret = []
    for (const d in tmpDeliveries) {
      const data = {}
      tmpDeliveries[d].forEach((del) => {
        if (!data[del.fuelType]) {
          data[del.fuelType] = 0
        }
        data[del.fuelType] += Number(del.litres)
      })
      ret.push({
        data,
        date: Number(d),
      })
    }
    report.deliveries = ret

    // Create a summary of deliveries
    const sum = {}
    report.deliveries.forEach((d) => {
      report.fuelTypes.forEach((ft) => {
        if (!sum[ft]) {
          sum[ft] = 0
        }
        if (d.data[ft]) {
          sum[ft] += d.data[ft]
        }
      })
    })
    report.deliverySummary = sum

    return report
  })
}
