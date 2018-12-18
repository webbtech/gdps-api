import GraphQLJSON from 'graphql-type-json'
import { gql } from 'apollo-server'
import moment from 'moment'

import { dynamoTables as dt, propaneTankIDs } from '../config/constants'
import {
  asyncForEach,
  weekStartEnd,
  weekDayRange,
  wkRange,
} from '../utils/utils'

export const typeDef = gql`
  extend type Query {
    propaneSaleMonthReport(date: String!): PropaneSaleMonthReport
  }
  type PropaneSaleMonthReport {
    periodSales: [PeriodSales]
    deliveries: [Delivery]
  }
  type PeriodSales {
    dates: PeriodDates
    sales: JSON
    summary: JSON
  }
  type PeriodDates {
    dateStart: Int
    dateEnd: Int
    dayRange: [Int]
    yearWeek: Int
  }
  type Delivery {
    date: Int
    litres: Int
  }
`

export const resolvers = {
  Query: {
    propaneSaleMonthReport: (
      _,
      { date },
      { docClient }
    ) => compilePropaneMonthSales(date, docClient),
  },
  JSON: GraphQLJSON,
}


const compilePropaneMonthSales = async (date, docClient) => {
  const weekRange = wkRange(date)
  const res = {
    periodSales: [],
    deliveries: [],
    periodOrder: weekRange.map(wk => wk.toString()),
  }

  await asyncForEach(weekRange, async (yrWk) => {
    const s = await fetchPropaneMonthSales(yrWk, docClient)
    res.periodSales.push(s)
    res.deliveries = await fetchPropaneMonthDeliveries(date, docClient)
  })

  return Object.assign({}, res)
}

const fetchPropaneMonthSales = async (yrWk, docClient) => {
  const [dateStart, dateEnd] = weekStartEnd(yrWk)
  const dayRange = weekDayRange(dateStart)
  const dates = {
    dateStart,
    dateEnd,
    dayRange,
    yearWeek: yrWk,
  }

  const params = {
    TableName: dt.PROPANE_SALE,
    ExpressionAttributeNames: {
      '#dte': 'Date',
    },
    ExpressionAttributeValues: {
      ':dateStart': dateStart,
      ':dateEnd': dateEnd,
    },
    FilterExpression: '#dte BETWEEN :dateStart AND :dateEnd',
    ProjectionExpression: '#dte, TankID, Sales',
  }

  const tmpItems = []
  const retObject = {
    dates,
    sales: {},
    summary: {},
  }
  return docClient.scan(params).promise().then((result) => {
    if (result.Items.length) {
      result.Items.forEach((ele) => {
        tmpItems.push({
          date: Number(ele.Date),
          tankID: Number(ele.TankID),
          sales: parseFloat(ele.Sales),
        })
      })
    }

    const retSales = []
    dayRange.forEach((d) => {
      const res = {}
      res[d] = {}
      tmpItems.forEach((item) => {
        if (item.date === d) {
          res[d][item.tankID] = item.sales
        }
      })
      const sales = {
        date: d,
        ...res[d],
      }
      retSales.push(sales)
    })
    retObject.sales = retSales

    // Set summary
    retObject.summary[propaneTankIDs[0]] = retSales.reduce(
      (accum, val) => accum + parseFloat(val[propaneTankIDs[0].toString()]), 0
    )
    retObject.summary[propaneTankIDs[1]] = retSales.reduce(
      (accum, val) => accum + parseFloat(val[propaneTankIDs[1].toString()]), 0
    )

    return retObject
  })
}

const fetchPropaneMonthDeliveries = async (date, docClient) => {
  const dteStart = moment(date).startOf('month').format('YYYYMMDD')
  const dteEnd = moment(date).endOf('month').format('YYYYMMDD')
  const year = moment(date).format('YYYY')

  const params = {
    IndexName: 'YearDateIndex',
    TableName: dt.PROPANE_DELIVER,
    ExpressionAttributeNames: {
      '#dte': 'Date',
      '#year': 'Year',
    },
    ExpressionAttributeValues: {
      ':dteStart': Number(dteStart),
      ':dteEnd': Number(dteEnd),
      ':year': Number(year),
    },
    KeyConditionExpression: '#year = :year AND #dte BETWEEN :dteStart AND :dteEnd',
    ProjectionExpression: '#dte, Litres',
  }

  return docClient.query(params).promise().then((result) => {
    const res = []
    result.Items.forEach((item) => {
      res.push({
        date: Number(item.Date),
        litres: Number(item.Litres),
      })
    })

    return res
  })
}
