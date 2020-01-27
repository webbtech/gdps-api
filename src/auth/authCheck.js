import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'
import jwtSet from './jwks.json'
import { COGNITO_USER_POOL_ID as userPoolID } from '../config/constants'

const ALG = 'RS256'
const pems = {}
for (let i = 0; i < jwtSet.keys.length; i++) {
  // take the jwt_set key and create a jwk object for conversion into PEM
  const jwk = {
    kty: jwtSet.keys[i].kty,
    n: jwtSet.keys[i].n,
    e: jwtSet.keys[i].e,
  }
  // convert jwk object into PEM
  const pem = jwkToPem(jwk)
  // append PEM to the pems object, with the kid as the identifier
  pems[jwtSet.keys[i].kid] = pem
}

const authCheck = tokenHdr => new Promise((res, reject) => {
  if (!tokenHdr) {
    reject('Missing auth header')
  }
  const token = tokenHdr.replace('Bearer ', '')

  const decodedJWT = jwt.decode(token, { complete: true })

  // reject if its not a valid JWT token
  if (!decodedJWT) {
    reject('Not a valid JWT token')
  }

  if (decodedJWT.header.alg !== ALG) {
    reject('Invalid token algorythm')
  }
  // NOTE: the next check seems redundant as the jwt.verify should handle this
  // Reject if ISS is not matching our userPoolID
  if (decodedJWT.payload.iss != userPoolID) {
    reject('Invalid token issuer')
  }

  // Reject the jwt if it's not an 'Access Token'
  if (decodedJWT.payload.token_use != 'access') {
    reject('Not an access token')
  }

  // Get jwtToken `kid` from header
  const kid = decodedJWT.header.kid
  const pem = pems[kid]
  if (!pem) {
    reject('Invalid access token')
  }

  jwt.verify(token, pem, (err, payload) => {
    if (err) {
      reject(err.message)
    } else {
      res(Object.assign(payload, { accessToken: token }))
    }
  })
})

export default authCheck
