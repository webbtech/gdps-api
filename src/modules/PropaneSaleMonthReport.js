import GraphQLJSON from 'graphql-type-json'
import { gql } from 'apollo-server'
import moment from 'moment'

import { asyncForEach, numberRange } from '../utils/utils'
import { dynamoTables as dt } from '../config/constants'
import { propaneTankIDs } from '../config/constants'

export const typeDef = gql`
  extend type Query {
    propaneSaleMonthReport(date: String!): PropaneSaleMonthReport
  }
  type PropaneSaleMonthReport {
    sales: JSON
    salesSummary: JSON
    deliveries: JSON
  }
`

export const resolvers = {
  Query: {
    propaneSaleMonthReport: (_, { date }, { db }) => {
      return compilePropaneMonthSales(date, db)
    },
  },
  JSON: GraphQLJSON,
}

const compilePropaneMonthSales = async (date, db) => {

  let res = {
    sales: {},
    salesSummary: {},
    deliveries: [],
  }

  const dte = moment(date)
  const startWk = dte.startOf('month').week()
  const endWk = dte.endOf('month').week()
  const yearWeekStart = parseInt(`${dte.year()}${startWk}`, 10)
  const yearWeekEnd = parseInt(`${dte.year()}${endWk}`, 10)

  const yrWkRange = numberRange(yearWeekStart, yearWeekEnd)
  await asyncForEach(yrWkRange, async yrWk => {
    res.sales[yrWk] = await fetchPropaneMonthSales(yrWk, db)
    res.deliveries = await fetchPropaneMonthDeliveries(dte, db)
  })
  res.salesSummary = setSummary(res.sales, propaneTankIDs)

  return Object.assign({}, res)
}

const fetchPropaneMonthSales = async (yrWk, db) => {

  // Create start and end dates for week period
  const year = yrWk.toString().substring(0, 4)
  const week = yrWk.toString().substring(4)
  const dte = moment().year(year).week(week)

  let dayRange = []
  for (let i=0; i<7; i++) {
    dayRange.push(Number(dte.day(i).format('YYYYMMDD')))
  }

  const params = {
    IndexName:  'YearWeekDateIndex',
    TableName:  dt.PROPANE_SALE,
    ExpressionAttributeNames: {
        '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':yrWk': {N: yrWk.toString()},
    },
    KeyConditionExpression: 'YearWeek = :yrWk',
    ProjectionExpression: '#dte, TankID, Sales',
  }

  let tmpItems = []
  return await db.query(params).promise().then(result => {
    if (!result.Items.length) return null

    result.Items.forEach(ele => {
      tmpItems.push({
        date: Number(ele.Date.N),
        tankID: Number(ele.TankID.N),
        sales: parseFloat(ele.Sales.N),
      })
    })

    let res = {}
    dayRange.forEach(d => {
      res[d] = {}
      tmpItems.forEach(item => {
        if (item.date === d) {
          res[d][item.tankID] = item.sales
        }
      })
    })

    return res
  })
}

const fetchPropaneMonthDeliveries = async (date, db) => {

  const dte       = moment(date)
  const dteStart  = dte.startOf('month').format('YYYYMMDD')
  const dteEnd    = dte.endOf('month').format('YYYYMMDD')
  const year      = dte.format('YYYY')

  const params = {
    IndexName:  'YearDateIndex',
    TableName:  dt.PROPANE_DELIVER,
    ExpressionAttributeNames: {
        '#dte':   'Date',
        '#year':  'Year',
    },
    ExpressionAttributeValues: {
      ':dteStart':  {N: dteStart},
      ':dteEnd':    {N: dteEnd},
      ':year':      {N: year},
    },
    KeyConditionExpression: '#year = :year AND #dte BETWEEN :dteStart AND :dteEnd',
    ProjectionExpression: '#dte, Litres',
  }

  return await db.query(params).promise().then(result => {

    let res = []
    result.Items.forEach(item => {
      res.push({
        date: Number(item.Date.N),
        litres: Number(item.Litres.N),
      })
    })

    return res
  })
}

const setSummary = (sales, tankIds) => {

  let ret = {}
  for (const wk in sales) {
    ret[wk] = {
      [tankIds[0]]: 0,
      [tankIds[1]]: 0,
    }
    for (const dt in sales[wk]) {
      ret[wk][tankIds[0]] += sales[wk][dt][tankIds[0].toString()]
      ret[wk][tankIds[1]] += sales[wk][dt][tankIds[1].toString()]
    }
  }

  return ret
}
