// import { ApolloServer, gql } from 'apollo-server-lambda'
import { ApolloServer, gql } from 'apollo-server'
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
const Query = gql`
  type Query {
    _empty: String
  }
`

const server = new ApolloServer({
  typeDefs: [
    Query,
    Dip,
    DipOSAnnualReport,
    DipOSMonthReport,
    DipOverShort,
    FuelDeliver,
    FuelPrice,
    FuelSale,
    FuelSaleDetailedReport,
    FuelSaleListReport,
    PropaneDeliver,
    Station,
    StationTank,
    Tank,
  ],
  resolvers: merge(
    dipOSAnnualReportResolvers,
    dipOSMonthReportResolvers,
    dipOverShortResolvers,
    dipResolvers,
    fuelDeliverResolvers,
    fuelPriceResolvers,
    fuelSaleDetailedReportResolvers,
    fuelSaleListReportResolvers,
    fuelSaleResolvers,
    propaneDeliverResolvers,
    stationResolvers,
    stationTankResolvers,
    tankResolvers
  ),
  context: async () => ({
    db: await new AWS.DynamoDB(),
  }),
})

/*exports.graphqlHandler = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  },
  // allowedHeaders: ['Content-Type', 'Authorization'],
  allowedHeaders: ['Authorization', 'Access-Control-Allow-Origin'],
})*/

// const server = new ApolloServer({ typeDefs, resolvers })
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`) // eslint-disable-line
})
