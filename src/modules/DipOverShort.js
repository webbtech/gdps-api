import { gql, ApolloError } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'
import { uniq } from 'lodash'

import { dynamoTables as dt } from '../config/constants'
import { fetchDeliveries } from './FuelDeliver'
import { fetchDipsRange } from './Dip'
import { fetchFuelSale } from './FuelSale'

export const typeDef = gql`
  extend type Mutation {
    createDipOS(input: DipOSInput): DipOverShort
  }
  extend type Query {
    dipOverShort(date: Int!, stationID: String!): DipOverShort
    dipOverShortRange(dateFrom: Int!, dateTo: Int!, stationID: String!): [DipOverShort]
  }
  type DipOverShort {
    date: Int
    overShort: JSON
    stationID: String
  }
  input DipOSInput {
    date: Int!
    stationID: String!
  }
`
export const resolvers = {
  Query: {
    dipOverShort: (_, { date, stationID }, { db }) => fetchOS(date, stationID, db),
    dipOverShortRange: (
      _,
      { dateFrom, dateTo, stationID },
      { db }
    ) => fetchOSRange(dateFrom, dateTo, stationID, db),
  },
  Mutation: {
    createDipOS: (_, { input }, { db }) => persistDipOS(input, db),
  },
  JSON: GraphQLJSON,
}

export const fetchOS = (date, stationID, db) => {
  const params = {
    TableName: dt.DIP_OVERSHORT,
    Key: {
      Date: { N: date.toString() },
      StationID: { S: stationID },
    },
    AttributesToGet: [
      'OverShort',
    ],
  }

  return db.getItem(params).promise().then((result) => {
    if (undefined === result.Item) return null
    const overshort = result.Item.OverShort.M

    return {
      date,
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
      ':stId': { S: stationID },
      ':dteFrom': { N: dateFrom.toString() },
      ':dteTo': { N: dateTo.toString() },
    },
    ProjectionExpression: '#dte, OverShort, StationID',
  }

  return db.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    const res = []
    result.Items.forEach((element) => {
      res.push({
        date: element.Date.N,
        overShort: extractOS(element.OverShort.M),
        stationID: element.StationID.S,
      })
    })

    return res
  })
}

export const persistDipOS = async ({ date, stationID }, db) => {
  const dateStr = date.toString()
  const dateObj = moment(dateStr)
  const dateTo = Number(dateObj.format('YYYYMMDD'))
  const dateFrom = Number(moment(dateStr).subtract(1, 'days').format('YYYYMMDD'))

  const dips = await fetchDipsRange(dateFrom, dateTo, stationID, db)
  const deliveries = await fetchDeliveries(dateTo, stationID, db)
  const fuelSalesRes = await fetchFuelSale(dateTo, stationID, db)
  // We're trapping this error because the dip won't calculate without, and
  // it's likely data hasn't been imported yet
  if (!fuelSalesRes) {
    throw new ApolloError('Missing fuel sale in persistDipOS')
  }

  const prevDips = aggregateDips(dips, dateFrom)
  const curDips = aggregateDips(dips, dateTo)
  const curNetDips = subDeliveries(curDips, deliveries)
  const netDips = subPrevDips(prevDips, curNetDips)
  const fuelSales = extractFS(fuelSalesRes)
  const dipOSs = dipOverShorts(netDips, fuelSales)

  const params = {
    TableName: dt.DIP_OVERSHORT,
    Item: {
      Date: { N: dateTo.toString() },
      OverShort: { M: dipOSs },
      StationID: { S: stationID },
      Year: { N: dateObj.format('YYYY') },
      YearMonth: { N: dateObj.format('YYYYMM') },
    },
  }

  try {
    await db.putItem(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  return {
    date: dateTo,
    stationID,
  }
}

// ======================== Utility functions =============================== //

const extractOS = (overshort) => {
  const ret = {}
  for (const m in overshort) {
    const ft = overshort[m].M
    ret[m] = {
      fuelType: ft.FuelType.S,
      tankLitres: parseInt(ft.TankLitres.N, 10),
      overShort: parseFloat(ft.OverShort.N),
      litresSold: parseFloat(ft.LitresSold.N),
    }
  }
  return ret
}

const extractFS = (fuelSales) => {
  const sales = {}
  for (const ft in fuelSales.sales) {
    sales[ft] = parseFloat(fuelSales.sales[ft].N)
  }
  return sales
}

const aggregateDips = (dips, date) => {
  const dte = date.toString()
  const dps = dips.filter(dip => dip.date === dte)
  const fts = uniq(dps.map(dp => dp.fuelType))

  const dpLtrs = {}
  fts.forEach((ft) => {
    dpLtrs[ft] = 0
    dps.forEach((dp) => {
      if (dp.fuelType === ft) {
        dpLtrs[ft] += Number(dp.litres)
      }
    })
  })
  return dpLtrs
}

const subDeliveries = (dips, deliveries) => {
  deliveries.forEach((del) => {
    dips[del.fuelType] -= Number(del.litres)
  })
  return dips
}

// The rule here says that if there was not a previous dip value (litres)
// then that fuelType OS does not get created
const subPrevDips = (prevDips, curDips) => {
  const netDips = {}
  const fuelTypes = Object.keys(prevDips)
  fuelTypes.forEach((ft) => {
    if (prevDips[ft]) { // skip any zero values
      netDips[ft] = prevDips[ft] - curDips[ft]
    }
  })
  return netDips
}

const dipOverShorts = (netDips, fuelSales) => {
  const dipOSs = {}
  const fuelTypes = Object.keys(netDips)
  fuelTypes.forEach((ft) => {
    dipOSs[ft] = {
      M: {
        FuelType: { S: ft },
        LitresSold: { N: fuelSales[ft].toString() },
        OverShort: { N: String(fuelSales[ft] - netDips[ft]) },
        TankLitres: { N: netDips[ft].toString() },
      },
    }
  })
  return dipOSs
}
