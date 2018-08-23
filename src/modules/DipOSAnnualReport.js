import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'
import { gql } from 'apollo-server'
import { uniq } from 'lodash'

import { dynamoTables as dt } from '../config/constants'
import { fetchTanks } from './StationTank'

export const typeDef = gql`
  extend type Query {
    dipOSAnnualReport(date: String!, stationID: String!): DipOSAnnualReport
  }
  type DipOSAnnualReport {
    fuelTypes: JSON
    months: JSON
    stationID: String
    summary: JSON
    year: Int
  }
`

export const resolvers = {
  Query: {
    dipOSAnnualReport: (_, { date, stationID }, { db }) => {
      return fetchDipOSAnnual(date, stationID, db)
    },
  },
  JSON: GraphQLJSON,
}

export const fetchDipOSAnnual = async (date, stationID, db) => {

  const dte = moment(date)
  const year = Number(dte.year())

  const tanks = await fetchTanks(stationID, db)
  const fuelTypes = uniq(tanks.map(t => t.fuelType))

  let res = {
    fuelTypes,
    months: {},
    stationID,
    year,
  }
  let monthRes = {}

  const months = setMonths(year)
  months.forEach(m => {
    monthRes[m] = []
  })

  const params = {
    IndexName:  'StationIDYearIndex',
    TableName:  dt.DIP_OVERSHORT,
    ExpressionAttributeNames: {
        '#year': 'Year',
    },
    ExpressionAttributeValues: {
      ':stId':  {S: stationID},
      ':year':  {N: year.toString()},
    },
    KeyConditionExpression: 'StationID = :stId AND #year = :year',
    ProjectionExpression: 'OverShort, YearMonth',
  }

  return await db.query(params).promise().then(result => {
    if (!result.Items.length) return null

    // Group results into months
    months.forEach(m => {
      result.Items.forEach(ele => {
        if (Number(ele.YearMonth.N) === m) {
          monthRes[m].push(ele)
        }
      })
    })

    // Sum each month by fuel type
    let accumRes = {}
    months.forEach(m => {
      accumRes[m] = {}
      fuelTypes.forEach(ft => {
        accumRes[m][ft] = monthRes[m].reduce(
          (accum, val) => accum + parseFloat(val.OverShort.M[ft].M.OverShort.N), 0.00
        )
      })
    })

    // Sum each fuel type
    let summary = {}
    fuelTypes.forEach(ft => {
      summary[ft] = result.Items.reduce(
        (accum, val) => accum + parseFloat(val.OverShort.M[ft].M.OverShort.N), 0.00
      )
    })

    res.months = accumRes
    res.summary = summary

    return res
  })
}

const setMonths = year => {
  let months = []
  const curYrM = Number(moment().format('YYYYMM'))
  for (let i=0; i < 12; i++) {
    const dte = Number(moment(new Date(year, i)).format('YYYYMM'))
    if (dte <= curYrM) {
      months.push(dte)
    }
  }
  return months
}
