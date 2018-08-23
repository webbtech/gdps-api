// import { ApolloServer, gql } from 'apollo-server-lambda'
import { ApolloServer, gql } from 'apollo-server'
import { createError } from'apollo-errors'
import { merge } from 'lodash'

import authCheck from './auth/authCheck'

import {
  typeDef as Dip,
  resolvers as dipResolvers,
} from './modules/Dip'

import {
  typeDef as DipOverShort,
  resolvers as dipOverShortResolvers,
} from './modules/DipOverShort'

import {
  typeDef as DipOSMonthReport,
  resolvers as dipOSMonthReportResolvers,
} from './modules/DipOSMonthReport'

import {
  typeDef as DipOSAnnualReport,
  resolvers as dipOSAnnualReportResolvers,
} from './modules/DipOSAnnualReport'

import {
  typeDef as FuelDeliver,
  resolvers as fuelDeliverResolvers,
} from './modules/FuelDeliver'

import {
  typeDef as FuelDeliveryReport,
  resolvers as fuelDeliveryReportResolvers,
} from './modules/FuelDeliveryReport'

import {
  typeDef as FuelPrice,
  resolvers as fuelPriceResolvers,
} from './modules/FuelPrice'

import {
  typeDef as FuelSale,
  resolvers as fuelSaleResolvers,
} from './modules/FuelSale'

import {
  typeDef as FuelSaleDetailedReport,
  resolvers as fuelSaleDetailedReportResolvers,
} from './modules/FuelSaleDetailedReport'

import {
  typeDef as FuelSaleListReport,
  resolvers as fuelSaleListReportResolvers,
} from './modules/FuelSaleListReport'

import {
  typeDef as ImportData,
  resolvers as importDataResolvers,
} from './modules/ImportData'

import {
  typeDef as PropaneDeliver,
  resolvers as propaneDeliverResolvers,
} from './modules/PropaneDeliver'

import {
  typeDef as PropaneSaleAnnualReport,
  resolvers as propaneSaleAnnualReportResolvers,
} from './modules/PropaneSaleAnnualReport'

import {
  typeDef as PropaneSaleMonthReport,
  resolvers as propaneSaleMonthReportResolvers,
} from './modules/PropaneSaleMonthReport'

import {
  typeDef as Station,
  resolvers as stationResolvers,
} from './modules/Station'

import {
  typeDef as StationTank,
  resolvers as stationTankResolvers,
} from './modules/StationTank'

import {
  typeDef as Tank,
  resolvers as tankResolvers,
} from './modules/Tank'

// Setup AWS
import AWS from 'aws-sdk'
import { config } from './config/dynamo'

AWS.config.update(config)

const AuthorizationError = createError('AuthorizationError', {
  message: 'You are not authorized!',
})

// Construct a schema, using GraphQL schema language
/*const Query = gql`
  type Query {
    _empty: String
  }
`*/

const Query = gql`
  type Query {
    hello: String
  }
`

const Mutation = gql`
  type Mutation {
    _empty: String
  }
`

// Used primarily as a heartbeat
const helloResolvers = {
  Query: {
    hello: () => 'Hello world!',
  },
}

const server = new ApolloServer({
  typeDefs: [
    Query,
    Mutation,
    Dip,
    DipOSAnnualReport,
    DipOSMonthReport,
    DipOverShort,
    FuelDeliver,
    FuelDeliveryReport,
    FuelPrice,
    FuelSale,
    FuelSaleDetailedReport,
    FuelSaleListReport,
    ImportData,
    PropaneDeliver,
    PropaneSaleAnnualReport,
    PropaneSaleMonthReport,
    Station,
    StationTank,
    Tank,
  ],
  resolvers: merge(
    helloResolvers,
    dipOSAnnualReportResolvers,
    dipOSMonthReportResolvers,
    dipOverShortResolvers,
    dipResolvers,
    fuelDeliverResolvers,
    fuelDeliveryReportResolvers,
    fuelPriceResolvers,
    fuelSaleDetailedReportResolvers,
    fuelSaleListReportResolvers,
    fuelSaleResolvers,
    importDataResolvers,
    propaneDeliverResolvers,
    propaneSaleAnnualReportResolvers,
    propaneSaleMonthReportResolvers,
    stationResolvers,
    stationTankResolvers,
    tankResolvers
  ),
  /*context: async ({ event }) => {
    const db = await new AWS.DynamoDB()
    let user
    try {
      user = await authCheck(event.headers.Authorization)
    } catch (err) {
      console.error(err) // eslint-disable-line
      throw new AuthorizationError()
    }
    return {
      db,
      user,
    }
  },*/
  // Local development without authentication
  context: async () => ({
    db: await new AWS.DynamoDB(),
  }),
  // Local development with authentication headers
  /*context: async ({ req }) => {
    // console.log('req.headers.authorization: ', req.headers.authorization)
    // console.log('req.headers: ', req.headers)
    let user
    try {
      user = await authCheck(req.headers.authorization)
    } catch (err) {
      console.error(err) // eslint-disable-line
      throw new AuthorizationError()
    }
    // console.log('user: ', user)
    return {
      db: await new AWS.DynamoDB(),
      user,
    }
  },*/
})

// console.log('process.env: ', process.env.NODE_ENV)

/*exports.graphqlHandler = server.createHandler({
  cors: {
    origin: '*',
    // methods: '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  },
})*/

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`) // eslint-disable-line
})
