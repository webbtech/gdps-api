import { dynamoTables as dt } from '../config/constants'

export const fetchTankID = async (docClient) => {
  const params = {
    TableName: dt.CONFIG,
    Key: {
      Key: 'TankID',
    },
    ExpressionAttributeNames: {
      '#val': 'Value',
    },
    ExpressionAttributeValues: {
      ':inc': 1,
    },
    UpdateExpression: 'SET #val = #val + :inc',
    ReturnValues: 'UPDATED_NEW',
  }

  let ret
  try {
    ret = await docClient.update(params).promise()
  } catch (err) {
    console.log('Error: ', err) // eslint-disable-line
    return err
  }
  return ret.Attributes.Value
}
