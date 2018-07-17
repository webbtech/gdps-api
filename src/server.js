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
  typeDef as FuelSaleWeekly,
  resolvers as fuelSaleWeeklyResolvers,
} from './modules/FuelSaleWeekly'

import {
  typeDef as FuelSaleMonthly,
  resolvers as fuelSaleMonthlyResolvers,
} from './modules/FuelSaleMonthly'

import {
  typeDef as FuelSaleReport,
  resolvers as fuelSaleReportResolvers,
} from './modules/FuelSaleReport'

import {
  typeDef as FuelSaleReportAll,
  resolvers as fuelSaleReportAllResolvers,
} from './modules/FuelSaleReportAll'

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
    DipOverShort,
    FuelDeliver,
    FuelPrice,
    FuelSale,
    FuelSaleMonthly,
    FuelSaleReport,
    FuelSaleReportAll,
    FuelSaleWeekly,
    PropaneDeliver,
    Station,
    StationTank,
    Tank,
  ],
  resolvers: merge(
    dipResolvers,
    dipOverShortResolvers,
    fuelDeliverResolvers,
    fuelSaleResolvers,
    fuelPriceResolvers,
    fuelSaleMonthlyResolvers,
    fuelSaleReportResolvers,
    fuelSaleReportAllResolvers,
    fuelSaleWeeklyResolvers,
    propaneDeliverResolvers,
    stationResolvers,
    stationTankResolvers,
    tankResolvers
  ),
  context: async () => ({
    db: await new AWS.DynamoDB(),
  }),
})

// exports.graphqlHandler = server.createHandler()

/*exports.graphqlHandler = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  },
})*/

// const server = new ApolloServer({ typeDefs, resolvers })
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`) // eslint-disable-line
})
