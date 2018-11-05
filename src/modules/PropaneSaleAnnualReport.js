import GraphQLJSON from 'graphql-type-json'
import { gql } from 'apollo-server'
import moment from 'moment'

import { dynamoTables as dt } from '../config/constants'
import { propaneTankIDs } from '../config/constants'
import { setMonths } from '../utils/utils'

export const typeDef = gql`
  extend type Query {
    propaneSaleAnnualReport(date: String!): PropaneSaleAnnualReport
  }
  type PropaneSaleAnnualReport {
    deliveries: JSON
    deliveryTotal: Int
    sales: JSON
    salesSummary: JSON
  }
`

export const resolvers = {
  Query: {
    propaneSaleAnnualReport: (_, { date }, { db }) => compilePropaneAnnualSales(date, db),
  },
  JSON: GraphQLJSON,
}

const compilePropaneAnnualSales = async (date, db) => {
  const res = {
    deliveries: {},
    deliveryTotal: 0,
    sales: {},
    salesSummary: {},
  }
  const year = moment(date).format('YYYY')
  const sales = await fetchPropaneSales(year, db)
  const deliveries = await fetchPropaneAnnualDeliveries(year, db)

  return Object.assign({}, res, sales, deliveries)
}

const fetchPropaneSales = async (year, db) => {
  const res = {
    sales: {},
    salesSummary: {},
  }

  const months = setMonths(year)

  const params = {
    IndexName: 'YearDateIndex',
    TableName: dt.PROPANE_SALE,
    ExpressionAttributeNames: {
      '#dte': 'Date',
      '#year': 'Year',
    },
    ExpressionAttributeValues: {
      ':year': { N: year },
    },
    KeyConditionExpression: '#year = :year',
    ProjectionExpression: '#dte, TankID, Sales',
  }

  return await db.query(params).promise().then((result) => {
    // Aggregate results into months and tank ids
    const sales = {}
    months.forEach((m) => {
      sales[m] = {}
      sales[m][propaneTankIDs[0]] = 0.00
      sales[m][propaneTankIDs[1]] = 0.00
      result.Items.forEach((item) => {
        const eleDte = Number(moment(item.Date.N).format('YYYYMM'))
        if (eleDte === m) {
          if (propaneTankIDs[0] === Number(item.TankID.N)) {
            sales[m][propaneTankIDs[0]] += parseFloat(item.Sales.N)
          } else if (propaneTankIDs[1] === Number(item.TankID.N)) {
            sales[m][propaneTankIDs[1]] += parseFloat(item.Sales.N)
          }
        }
      })
    })

    // Sum by tankID
    const sum = {}
    sum[propaneTankIDs[0]] = 0.00
    sum[propaneTankIDs[1]] = 0.00
    for (const m in sales) {
      sum[propaneTankIDs[0]] += sales[m][propaneTankIDs[0].toString()]
      sum[propaneTankIDs[1]] += sales[m][propaneTankIDs[1].toString()]
    }

    res.sales = sales
    res.salesSummary = sum

    return res
  })
}

const fetchPropaneAnnualDeliveries = async (year, db) => {
  const months = setMonths(year)

  const params = {
    IndexName: 'YearDateIndex',
    TableName: dt.PROPANE_DELIVER,
    ExpressionAttributeNames: {
      '#dte': 'Date',
      '#year': 'Year',
    },
    ExpressionAttributeValues: {
      ':year': { N: year },
    },
    KeyConditionExpression: '#year = :year',
    ProjectionExpression: '#dte, Litres',
  }

  return await db.query(params).promise().then((result) => {
    const res = {}
    let total = 0
    months.forEach((m) => {
      res[m] = 0
      result.Items.forEach((item) => {
        const eleDte = Number(moment(item.Date.N).format('YYYYMM'))
        if (eleDte === m) {
          res[m] += Number(item.Litres.N)
          total += Number(item.Litres.N)
        }
      })
    })

    return {
      deliveries: res,
      deliveryTotal: total,
    }
  })
}
