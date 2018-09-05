import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'
import request from 'request-promise-native'
import { gql } from 'apollo-server'
import { uniq } from 'lodash'

import { dynamoTables as dt } from '../config/constants'
import { fetchStationTanks } from './StationTank'
import { FUEL_TYPE_LIST as fuelTypeList } from '../config/constants'
import { FUELSALE_REPORT_LAMBDA as lambdaURI } from '../config/constants'

// For testing
// const lambdaURI = 'http://127.0.0.1:3000/fuelsale'

export const typeDef = gql`
extend type Mutation {
  fuelSaleDownload(date: String!, stationID: String!): FuelSaleDwnld
}
extend type Query {
  fuelSale(date: String!, stationID: String!): FuelSale,
  fuelSaleMonth(date: String!, stationID: String!): FuelSalesMonth,
  fuelSaleRange(dateFrom: String!, dateTo: String!, stationID: String!): [FuelSale]
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
`

export const resolvers = {
  Mutation: {
    fuelSaleDownload: (_, { date, stationID }, { user }) => {
      return createFuelSaleDwnld(date, stationID, user)
    },
  },
  Query: {
    fuelSale: (_, { date, stationID }, { db }) => {
      return fetchFuelSale(date, stationID, db)
    },
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
  },
  JSON: GraphQLJSON,
}

export const fetchFuelSale = (date, stationID, db) => {

  const dte = moment(date).format('YYYYMMDD')
  const params = {
    TableName: dt.FUEL_SALE,
    Key: {
      Date:       {N: dte},
      StationID:  {S: stationID},
    },
    AttributesToGet: [
      'Date',
      'Sales',
      'StationID',
    ],
  }

  return db.getItem(params).promise().then(result => {

    if (undefined === result.Item) return null

    return {
      date:       result.Item.Date.N,
      sales:      result.Item.Sales.M,
      stationID:  result.Item.StationID.S,
    }
  })
}

export const fetchFuelSaleRange = async (dateFrom, dateTo, stationID, db) => {

  const tanks = await fetchStationTanks(stationID, db)
  const fuelTypes = uniq(tanks.map(t => t.fuelType))
  const stationFTs = fuelTypeList.filter(ft => fuelTypes.includes(ft))

  const params = {
    TableName: dt.FUEL_SALE,
    ExpressionAttributeNames: {
        '#dte': 'Date',
    },
    KeyConditionExpression: 'StationID = :stId AND #dte BETWEEN :dteFrom AND :dteTo',
    ExpressionAttributeValues: {
      ':stId':    {S: stationID},
      ':dteFrom': {N: dateFrom},
      ':dteTo':   {N: dateTo},
    },
    ProjectionExpression: '#dte, Sales',
  }

  return db.query(params).promise().then(result => {

    if (!result.Items.length) return null

    let res = []
    result.Items.forEach(ele => {
      res.push({
        date:   ele.Date.N,
        sales:  extractSales(ele.Sales.M, stationFTs),
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

const createFuelSaleDwnld = (date, stationID, user) => {

  const retDate = Number(moment(date).format('YYYYMMDD'))

  const options = {
    uri: lambdaURI,
    headers: {
        'Authorization': `${user.accessToken}`,
    },
    method: 'POST',
    json: {
      date,
      stationID,
    },
  }

  return request(options).then(body => {
    return {
      date: retDate,
      reportLink: body.data.url,
      stationID,
    }
  })

}

const extractSales = (sales, fuelTypes) => {
  const ret = {}
  fuelTypes.forEach(ft => {
    ret[ft] = Number(sales[ft].N)
  })
  return ret
}

const setSummary = (sales, fuelTypes) => {
  let ret = {}
  fuelTypes.forEach(ft => {
    ret[ft] = 0.00
  })
  sales.forEach(s => {
    fuelTypes.forEach(ft => {
      ret[ft] += s.sales[ft]
    })
  })
  return ret
}

const setTotal = (sales) => {
  let ret = 0.00
  for (const ft in sales) {
    ret += sales[ft]
  }
  return ret
}
