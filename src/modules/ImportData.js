import { gql } from 'apollo-server'
import request from 'request-promise-native'
import moment from 'moment'
import { dynamoTables as dt } from '../config/constants'

import { FUELSALE_EXPORT_LAMBDA as lambdaURI } from '../config/constants'
// const LambdaFuncPath = 'http://127.0.0.1:3000/export'

const validImportTypes = ['fuel', 'propane']

export const typeDef = gql`
extend type Mutation {
  importData(dateStart: String!, dateEnd: String!, importType: String!): ImportData
}
extend type Query {
  importLog(importType: String!): [ImportData]
}
type ImportData {
  dateStart: String
  dateEnd: String
  importDate: String
  importType: String
  recordQty: Int
}
`

export const resolvers = {
  Mutation: {
    importData: (_, { dateStart, dateEnd, importType }, { user }) => {
      const dates = validateDates(dateStart, dateEnd)
      if (!dates) {
        return null
      }
      if (!validateType(importType)) {
        return null
      }
      return importFuel(dates, importType, user)
    },
  },
  Query: {
    importLog: (_, { importType }, { db }) => fetchImports(importType, db),
  },
}

const importFuel = (dates, importType, user) => {
  const options = {
    uri: lambdaURI,
    headers: {
      Authorization: `${user.accessToken}`,
    },
    method: 'POST',
    json: {
      exportType: importType,
      dateStart: dates.startDate,
      dateEnd: dates.endDate,
    },
  }

  return request(options).then(body => ({
    dateStart: body.DateStart,
    dateEnd: body.DateEnd,
    recordQty: body.RecordQty,
    importType: body.ImportType,
    importDate: body.ImportDate,
  }))
}

export const fetchImports = (importType, db) => {
  const params = {
    ExpressionAttributeValues: {
      ':importType': { S: importType },
    },
    KeyConditionExpression: 'ImportType = :importType',
    Limit: 40,
    ProjectionExpression: 'DateStart, DateEnd, ImportDate, ImportType, RecordQty',
    ScanIndexForward: false,
    TableName: dt.IMPORT_LOG,
  }

  return db.query(params).promise().then((result) => {
    const res = []
    result.Items.forEach((ele) => {
      res.push({
        dateStart: ele.DateStart.S,
        dateEnd: ele.DateEnd.S,
        importDate: ele.ImportDate.S,
        importType: ele.ImportType.S,
        recordQty: ele.RecordQty.N,
      })
    })

    return res
  })
}

// ========================= Helper Functions ========================= //

const validateDates = (startDate, endDate) => {
  const stDteValid = moment(startDate).isValid()
  const enDteValid = moment(endDate).isValid()
  if (!stDteValid || !enDteValid) {
    console.error('ERROR: Invalid start or end date') // eslint-disable-line
    return false
  }

  return {
    startDate: moment(startDate).format('YYYY-MM-DD'),
    endDate: moment(endDate).format('YYYY-MM-DD'),
  }
}

const validateType = (type) => {
  if (!validImportTypes.includes(type)) {
    console.error('ERROR: Invalid import type requested') // eslint-disable-line
    return false
  }
  return type
}
