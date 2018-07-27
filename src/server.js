import { ApolloServer, gql } from 'apollo-server-lambda'
// import { ApolloServer, gql } from 'apollo-server'
import { merge } from 'lodash'

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

// Provide resolver functions for your schema fields
const helloResolvers = {
  Query: {
    hello: () => 'Hello world!',
  },
}

const server = new ApolloServer({
  typeDefs: [
    Query,
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
    propaneDeliverResolvers,
    propaneSaleAnnualReportResolvers,
    propaneSaleMonthReportResolvers,
    stationResolvers,
    stationTankResolvers,
    tankResolvers
  ),
  context: async () => ({
    db: await new AWS.DynamoDB(),
  }),
})

exports.graphqlHandler = server.createHandler({
  cors: {
    origin: '*',
    // methods: '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  },
})

/*server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`) // eslint-disable-line
})*/
