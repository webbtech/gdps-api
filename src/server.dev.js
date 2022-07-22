import { ApolloServer } from 'apollo-server'

import AWS from 'aws-sdk'
import { createError } from 'apollo-errors'

import graphql from './graphql'
import { config } from './config/dynamo'

const AuthorizationError = createError('AuthorizationError', {
  message: 'You are not authorized!',
})

AWS.config.update(config)

// Local development context without authentication
const context = async () => ({ // eslint-disable-line
  db: await new AWS.DynamoDB(),
  docClient: await new AWS.DynamoDB.DocumentClient(),
})

// Local development context with authentication headers
const contextAuth = async ({ req }) => { // eslint-disable-line
  const db = await new AWS.DynamoDB()
  const docClient = await new AWS.DynamoDB.DocumentClient()

  if (!req.headers.authorization) {
    throw new AuthorizationError()
  }
  const token = req.headers.authorization

  return {
    db,
    docClient,
    token,
  }
}

const server = new ApolloServer(graphql)
// server.context = context
server.context = contextAuth
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`) // eslint-disable-line
})
