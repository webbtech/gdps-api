// import { ApolloServer } from 'apollo-server-lambda'
import { ApolloServer } from 'apollo-server'

import AWS from 'aws-sdk'
import { createError } from'apollo-errors'

import authCheck from './auth/authCheck'
import graphql from './graphql.js'
import { config } from './config/dynamo'

const AuthorizationError = createError('AuthorizationError', {
  message: 'You are not authorized!',
})

AWS.config.update(config)

// Local development context without authentication
const context = async () => ({
  db: await new AWS.DynamoDB(),
  docClient: await new AWS.DynamoDB.DocumentClient(),
})

// Local development context with authentication headers
const contextAuth = async ({ req }) => { // eslint-disable-line
  let user
  try {
    user = await authCheck(req.headers.authorization)
  } catch (err) {
    console.error(err) // eslint-disable-line
    throw new AuthorizationError()
  }
  return {
    db: await new AWS.DynamoDB(),
    user,
  }
}
// console.log('process.env: ', process.env.NODE_ENV)

const server = new ApolloServer(graphql)
server.context = context
// server.context = contextAuth
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`) // eslint-disable-line
})
