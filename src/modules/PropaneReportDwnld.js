
import GraphQLJSON from 'graphql-type-json'
import request from 'request-promise-native'
import { gql } from 'apollo-server'
import { extendMoment } from 'moment-range'
import Moment from 'moment'

import { momentToNumber } from '../utils/utils'
import { dynamoTables as dt } from '../config/constants'
import { PROPANE_REPORT_LAMBDA as lambdaURI } from '../config/constants'

const moment = extendMoment(Moment)


export const typeDef = gql`
extend type Mutation {
  propaneSignedURL(date: String!): PropaneDwnld
}

extend type Query {
 propaneReportDwnld(date: String!): PropaneReport
}

type PropaneReport {
  date: String
  deliveries: JSON
  sales: [PropaneSale]
}

type PropaneSale {
  date: String
  sales: JSON
}

type PropaneDwnld {
  date: Int,
  reportLink: String
}
`

export const resolvers = {
  Mutation: {
    propaneSignedURL: (_, { date }, { user }) => createSignedURL(date, user),
  },
  Query: {
    propaneReportDwnld: (_, { date }, { docClient }) => compilePropaneReportDwnld(date, docClient),
  },
  JSON: GraphQLJSON,
}

const compilePropaneReportDwnld = async (date, docClient) => {
  const res = {
    date: '',
    sales: {},
    deliveries: {},
  }
  const startDay = moment(date).startOf('month')
  const endDay = moment(date).endOf('month')

  // res.date = moment(date).format('YYYY-MM')
  res.date = moment(date).format()
  res.sales = await fetchSales(startDay, endDay, docClient)
  res.deliveries = await fetchDeliveries(startDay, endDay, docClient)

  return res
}

const fetchSales = async (startDay, endDay, docClient) => {
  const year = Number(startDay.format('YYYY'))
  const range = moment.range(startDay, endDay)
  const startDate = momentToNumber(startDay)
  const endDate = momentToNumber(endDay)

  const dayRange = []
  for (const day of range.by('day')) {
    dayRange.push(Number(day.format('YYYYMMDD')))
  }

  const params = {
    TableName: dt.PROPANE_SALE,
    IndexName: 'YearDateIndex',
    ExpressionAttributeValues: {
      ':startDate': startDate,
      ':endDate': endDate,
      ':year': year,
    },
    ExpressionAttributeNames: {
      '#dte': 'Date',
      '#year': 'Year',
    },
    KeyConditionExpression: '#year = :year AND #dte BETWEEN :startDate AND :endDate',
  }

  const result = []
  let dbRes
  try {
    dbRes = await docClient.query(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  dayRange.forEach((d) => {
    const record = {
      date: moment(d.toString()).format('YYYY-MM-DD'),
      sales: {},
    }
    dbRes.Items.forEach((ele) => {
      if (ele.Date === d) {
        record.sales[ele.TankID] = ele.Sales
      }
    })
    result.push(record)
  })

  return result
}

const fetchDeliveries = async (startDay, endDay, docClient) => {
  const year = Number(startDay.format('YYYY'))
  const startDate = momentToNumber(startDay)
  const endDate = momentToNumber(endDay)

  const params = {
    TableName: dt.PROPANE_DELIVER,
    IndexName: 'YearDateIndex',
    ExpressionAttributeValues: {
      ':startDate': startDate,
      ':endDate': endDate,
      ':year': year,
    },
    ExpressionAttributeNames: {
      '#dte': 'Date',
      '#year': 'Year',
    },
    KeyConditionExpression: '#year = :year AND #dte BETWEEN :startDate AND :endDate',
  }

  const result = {}
  let dbRes

  try {
    dbRes = await docClient.query(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  dbRes.Items.forEach((ele) => {
    const dte = moment(ele.Date.toString()).format('YYYY-MM-DD')
    result[dte] = ele.Litres
  })

  return result
}

const createSignedURL = async (date, user) => {
  const retDate = Number(moment(date).format('YYYYMMDD'))

  const options = {
    uri: lambdaURI,
    headers: {
      Authorization: `${user.accessToken}`,
    },
    method: 'POST',
    json: {
      date,
    },
  }

  return request(options).then(body => ({
    date: retDate,
    reportLink: body.data.url,
  }))
}
