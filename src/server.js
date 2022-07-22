import { ApolloServer } from 'apollo-server-lambda'

import AWS from 'aws-sdk'
import { createError } from 'apollo-errors'

import graphql from './graphql'
import { config } from './config/dynamo'

const AuthorizationError = createError('AuthorizationError', {
  message: 'You are not authorized!',
})

// Setup AWS
AWS.config.update(config)

// Live server context
const context = async ({ event }) => {
  const db = await new AWS.DynamoDB()
  const docClient = await new AWS.DynamoDB.DocumentClient()

  if (!event.headers.Authorization) {
    throw new AuthorizationError()
  }
  const token = event.headers.Authorization

  return {
    db,
    docClient,
    token,
  }
}

const server = new ApolloServer(graphql)
server.context = context

exports.graphqlHandler = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  },
})
