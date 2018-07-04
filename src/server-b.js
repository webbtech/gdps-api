// import { ApolloServer, gql } from 'apollo-server'
import { ApolloServer, gql } from 'apollo-server-lambda'

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

import AWS from 'aws-sdk'
import { config } from './config/dynamo'

AWS.config.update(config)

const Query = gql`
  type Query {
    _empty: String
  }
`

const server = new ApolloServer({
  typeDefs: [ Query, Dip, DipOverShort, FuelDeliver, FuelPrice, PropaneDeliver, Station, StationTank, Tank ],
  resolvers: merge(dipResolvers, dipOverShortResolvers, fuelDeliverResolvers, fuelPriceResolvers, propaneDeliverResolvers, stationResolvers, stationTankResolvers, tankResolvers),
  /*context: async () => ({
    db: await new AWS.DynamoDB(),
  }),*/
})

exports.graphqlHandler = server.createHandler()
// console.log('graphqlHandler: ', graphqlHandler)

/*server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`) // eslint-disable-line
})*/
