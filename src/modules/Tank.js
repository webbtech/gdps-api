import { gql } from 'apollo-server'
import GraphQLJSON from 'graphql-type-json'
import moment from 'moment'

import { dynamoTables as dt } from '../config/constants'
import { fetchTankID } from './Config'

export const typeDef = gql`
  extend type Mutation {
    createTank(input: TankInput): Tank
  }
  extend type Mutation {
    updateTank(input: TankInput): Tank
  }
  extend type Mutation {
    updateTankLevels(input: TankInput): Tank
  }
  extend type Query {
    tank(id: String!): Tank
    tankList: [Tank]
  }
  type Tank {
    id: String
    createdAt: Int
    description: String
    levels: JSON
    model: String
    size: Int
    status: STATUS
    updatedAt: Int
  }
  type Level {
    level: String
  }
  input TankInput {
    id: String
    description: String
    levels: JSON
    model: String
    size: Int
    status: STATUS
  }
  scalar JSON
  enum STATUS {
    OK
    ERROR
    PENDING
    PROCESSING
  }
`

export const resolvers = {
  Mutation: {
    createTank: (_, { input }, { docClient }) => {
      return createTank(input, docClient)
    },
    updateTank: (_, { input }, { docClient }) => {
      return updateTank(input, docClient)
    },
    updateTankLevels: (_, { input }, { docClient }) => {
      return updateTankLevels(input, docClient)
    },
  },
  Query: {
    tank: (_, { id }, { db }) => {
      return fetchTank(id, db)
    },
    tankList: (_, vars, { db }) => {
      return fetchTankList(db)
    },
  },
  JSON: GraphQLJSON,
}

export const fetchTank = (id, db) => {
  const params = {
    TableName: dt.TANK,
    Key: {
      'ID': {S: id},
    },
    ProjectionExpression: 'ID, Description, Levels, Model, Size, #status',
    ExpressionAttributeNames: {
      '#status': 'Status',
    },
  }

  return db.getItem(params).promise().then(result => {
    return {
      id:           result.Item.ID.S,
      description:  result.Item.Description ? result.Item.Description.S : null,
      levels:       result.Item.Levels ? extractLevels(result.Item.Levels.M) : null,
      model:        result.Item.Model ? result.Item.Model.S : null,
      size:         result.Item.Size.N,
      status:       result.Item.Status ? result.Item.Status.S : 'OK',
    }
  })
}

export const fetchTankList = (db) => {

  const params = {
    AttributesToGet: ['ID', 'Description', 'Levels', 'Model', 'Size', 'Status'],
    TableName: dt.TANK,
  }

  return db.scan(params).promise().then(result => {

    let res = []
    result.Items.forEach(ele => {
      res.push({
        id:           ele.ID.S,
        description:  ele.Description ? ele.Description.S : null,
        levels:       ele.Levels ? extractLevels(ele.Levels.M) : null,
        model:        ele.Model ? ele.Model.S : null,
        size:         ele.Size.N,
        status:       ele.Status ? ele.Status.S : 'OK',
      })
    })
    return res
  })
}

const createTank = async (input, docClient) => {

  const tankID = await fetchTankID(docClient)
  // const tankID = 99
  const params = {
    TableName: dt.TANK,
    Item: {
      ID:           tankID.toString(),
      CreatedAt:    moment().valueOf(),
      Description:  input.description,
      Model:        input.model,
      Size:         input.size,
      Status:       'PENDING',
    },
  }

  try {
    await docClient.put(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  return {
    id: tankID,
  }
}

/**
  This step updates all the tanks attributes with exception of the levels
  which is handled with a lambda trigger and therefore the Status is
  handled by the lambda trigger.
*/
const updateTank = async (input, docClient) => {

  const params = {
    TableName: dt.TANK,
    Key: {
      'ID' : input.id,
    },
    UpdateExpression: 'set Description = :descrip, Model = :model, Size = :size, UpdatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':descrip' :  input.description,
      ':model' :    input.model,
      ':size' :     input.size,
      ':updatedAt': moment().valueOf(),
    },
    ReturnValues: 'ALL_NEW',
  }

  let ret
  try {
    ret = await docClient.update(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  return {
    id:           ret.Attributes.ID,
    description:  ret.Attributes.Description,
    model:        ret.Attributes.Model,
  }
}

const updateTankLevels = async (input, docClient) => {

  const params = {
    TableName: dt.TANK,
    Key: {
      'ID' : input.id,
    },
    UpdateExpression: 'set Levels = :levels, UpdatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':levels':    input.levels,
      ':updatedAt': moment().valueOf(),
    },
    ReturnValues: 'ALL_NEW',
  }

  let ret
  try {
    ret = await docClient.update(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }

  return {
    id: ret.Attributes.ID,
    levels: ret.Attributes.Levels,
  }
}

const extractLevels = levels => {
  let l = {}
  for (let m in levels) {
    const level = levels[m].M
    l[m] = {
      litres: Number(level.litres.N),
      level:  Number(level.level.N),
    }
  }
  return l
}
