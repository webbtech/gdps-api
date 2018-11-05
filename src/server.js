import { ApolloServer } from 'apollo-server-lambda'

import AWS from 'aws-sdk'
import { createError } from 'apollo-errors'

import authCheck from './auth/authCheck'
import graphql from './graphql.js'
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
  let user
  try {
    user = await authCheck(event.headers.Authorization)
  } catch (err) {
    console.error(err) // eslint-disable-line
    throw new AuthorizationError()
  }
  return {
    db,
    docClient,
    user,
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
