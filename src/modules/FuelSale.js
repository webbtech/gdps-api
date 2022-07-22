import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'
import request from 'request-promise-native'
import { gql } from 'apollo-server'
import compose from 'ramda/src/compose'
import pluck from 'ramda/src/pluck'
import uniq from 'ramda/src/uniq'

import { asyncForEach } from '../utils/utils'
import { fetchStationTanks } from './StationTank'
import { fetchStations } from './Station'
import {
  dynamoTables as dt,
  FUEL_TYPE_LIST as fuelTypeList,
  FUELSALE_REPORT_LAMBDA as lambdaFSURI,
  FUELSALE_SUM_REPORT_LAMBDA as lambdaFSSumURI,
} from '../config/constants'

// For testing
// const lambdaFSURI = 'http://127.0.0.1:3000/fuelsale'

const fuelTypeGroups = {
  NL: ['NL', 'SNL'],
  DSL: ['DSL', 'CDSL'],
}

export const typeDef = gql`
  extend type Mutation {
    fuelSaleDownload(date: String!, stationID: String!): FuelSaleDwnld
    fuelSaleRangeSummaryDownload(dateFrom: String!, dateTo: String!): FuelSalesSummaryDwnld
  }
  extend type Query {
    fuelSale(date: String!, stationID: String!): FuelSale,
    fuelSaleLatest(stationID: String!): FuelSale,
    fuelSaleMonth(date: String!, stationID: String!): FuelSalesMonth,
    fuelSaleRange(dateFrom: String!, dateTo: String!, stationID: String!): FuelSalesMonth
    fuelSaleRangeSummary(dateFrom: String!, dateTo: String!): FuelSalesSummary
  }
  type FuelSale {
    date: Int
    sales: JSON
    stationID: String
  }
  type FuelSaleDwnld {
    date: Int,
    stationID: String
    reportLink: String
  }
  type FuelSalesMonth {
    fuelTypes: JSON
    stationSales: [FuelSale]
    salesSummary: JSON
    salesTotal: Float
  }
  type StationSummary {
    hasDSL: Boolean
    stationID: String
    stationName: String
    fuels: Fuels
  }
  type FuelSalesSummary {
    dateStart: Int!
    dateEnd: Int!,
    summary: [StationSummary]
  }
  type Fuels {
     NL: Float
    DSL: Float
  }
  type FuelSalesSummaryDwnld {
    dateStart: Int!
    dateEnd: Int!,
    reportLink: String!
  }
`

//
// ======================== Start Helper Functions ========================== //
//

const extractSales = (sales, fuelTypes) => {
  const ret = {}
  fuelTypes.forEach((ft) => {
    ret[ft] = Number(sales[ft].N)
  })
  return ret
}

const setSummary = (sales, fuelTypes) => {
  const ret = {}
  fuelTypes.forEach((ft) => {
    ret[ft] = 0.00
  })
  sales.forEach((s) => {
    fuelTypes.forEach((ft) => {
      ret[ft] += s.sales[ft]
    })
  })
  return ret
}

const setTotal = (sales) => {
  let ret = 0.00
  Object.keys(sales).forEach((ft) => {
    ret += sales[ft]
  })
  return ret
}

const sortedFuelTypes = (ftl, ftps) => ftl.filter(ft => ftps.includes(ft))

//
// ======================== End Helper Functions ============================ //
//

export const fetchFuelSale = (date, stationID, db) => {
  const dte = moment(date.toString()).format('YYYYMMDD')
  const params = {
    TableName: dt.FUEL_SALE,
    Key: {
      Date: { N: dte },
      StationID: { S: stationID },
    },
    AttributesToGet: [
      'Date',
      'Sales',
      'StationID',
    ],
  }

  return db.getItem(params).promise().then((result) => {
    if (undefined === result.Item) return null

    return {
      date: result.Item.Date.N,
      sales: result.Item.Sales.M,
      stationID: result.Item.StationID.S,
    }
  })
}

export const fetchFuelSaleRange = async (dateFrom, dateTo, stationID, db) => {
  const tanks = await fetchStationTanks(stationID, db)
  const stationFTs = sortedFuelTypes(fuelTypeList, compose(uniq, pluck('fuelType'))(tanks))

  const params = {
    TableName: dt.FUEL_SALE,
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dteFrom AND :dteTo',
    ExpressionAttributeValues: {
      ':stId': { S: stationID },
      ':dteFrom': { N: dateFrom },
      ':dteTo': { N: dateTo },
    },
    ProjectionExpression: '#dte, Sales',
  }

  return db.query(params).promise().then((result) => {
    if (!result.Items.length) return null

    const res = []
    result.Items.forEach((ele) => {
      res.push({
        date: ele.Date.N,
        sales: extractSales(ele.Sales.M, stationFTs),
      })
    })

    const salesSummary = setSummary(res, stationFTs)
    const salesTotal = setTotal(salesSummary)
    return {
      fuelTypes: stationFTs,
      stationSales: res,
      salesSummary,
      salesTotal,
    }
  })
}

const fetchFuelSaleRangeSumByStation = async (dateFrom, dateTo, stationID, db, docClient) => {
  const params = {
    TableName: dt.FUEL_SALE,
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dteFrom AND :dteTo',
    ExpressionAttributeValues: {
      ':dteFrom': Number(dateFrom),
      ':dteTo': Number(dateTo),
      ':stId': stationID,
    },
    ProjectionExpression: '#dte, Sales',
  }

  let dbRes
  try {
    dbRes = await docClient.query(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  const ret = {
    NL: 0.00,
    DSL: 0.00,
  }
  dbRes.Items.forEach((i) => {
    fuelTypeGroups.NL.forEach((ft) => {
      ret.NL += i.Sales[ft]
    })
    fuelTypeGroups.DSL.forEach((ft) => {
      ret.DSL += i.Sales[ft]
    })
  })

  return ret
}

const createFuelSaleDwnld = (date, stationID, token) => {
  const retDate = Number(moment(date).format('YYYYMMDD'))

  const options = {
    uri: lambdaFSURI,
    headers: {
      Authorization: token,
    },
    method: 'POST',
    json: {
      date,
      stationID,
    },
  }

  return request(options).then(body => ({
    date: retDate,
    reportLink: body.data.url,
    stationID,
  }))
}

const createFuelSaleSummaryDwnld = (dateFrom, dateTo, token) => {
  const options = {
    uri: lambdaFSSumURI,
    headers: {
      Authorization: token,
    },
    method: 'POST',
    json: {
      dateFrom,
      dateTo,
    },
  }

  return request(options).then(body => ({
    dateStart: Number(moment(dateFrom).format('YYYYMMDD')),
    dateEnd: Number(moment(dateTo).format('YYYYMMDD')),
    reportLink: body.data.url,
  }))
}

const fetchFuelSaleLatest = async (stationID, docClient) => {
  const params = {
    ExpressionAttributeValues: {
      ':station': stationID,
    },
    KeyConditionExpression: 'StationID = :station',
    TableName: dt.FUEL_SALE,
    Limit: 1,
    ScanIndexForward: false,
  }

  let res
  try {
    res = await docClient.query(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  const item = res.Items[0]
  return {
    date: item.Date,
    sales: item.Sales,
    stationID: item.StationID,
  }
}

const fetchFuelSaleRangeSummary = async (dteFrom, dteTo, db, docClient) => {
  const stations = await fetchStations(null, db)

  const ret = {
    dateEnd: Number(dteTo),
    dateStart: Number(dteFrom),
    summary: [],
  }
  await asyncForEach(stations, async (station) => {
    const stSales = await fetchFuelSaleRangeSumByStation(dteFrom, dteTo, station.id, db, docClient)
    ret.summary.push({
      fuels: stSales,
      hasDSL: stSales.DSL > 0,
      stationID: station.id,
      stationName: station.name,
    })
  })

  return ret
}


export const resolvers = {
  Mutation: {
    fuelSaleDownload: (_, { date, stationID }, { token }) =>
      createFuelSaleDwnld(date, stationID, token), // eslint-disable-line
    fuelSaleRangeSummaryDownload: (_, { dateFrom, dateTo }, { token }) =>
      createFuelSaleSummaryDwnld(dateFrom, dateTo, token), // eslint-disable-line
  },
  Query: {
    fuelSale: (_, { date, stationID }, { db }) => fetchFuelSale(date, stationID, db),
    fuelSaleMonth: (_, { date, stationID }, { db }) => {
      const dte = moment(date.toString())
      const dateFrom = dte.startOf('month').format('YYYYMMDD')
      const dateTo = dte.endOf('month').format('YYYYMMDD')
      return fetchFuelSaleRange(dateFrom, dateTo, stationID, db)
    },
    fuelSaleRange: (_, { dateFrom, dateTo, stationID }, { db }) => {
      const dteFrom = moment(dateFrom).format('YYYYMMDD')
      const dteTo = moment(dateTo).format('YYYYMMDD')
      return fetchFuelSaleRange(dteFrom, dteTo, stationID, db)
    },
    fuelSaleRangeSummary: (_, { dateFrom, dateTo }, { db, docClient }) => {
      const dteFrom = moment(dateFrom).format('YYYYMMDD')
      const dteTo = moment(dateTo).format('YYYYMMDD')
      return fetchFuelSaleRangeSummary(dteFrom, dteTo, db, docClient)
    },
    fuelSaleLatest: (_, { stationID }, { docClient }) => fetchFuelSaleLatest(stationID, docClient),
  },
  JSON: GraphQLJSON,
}
