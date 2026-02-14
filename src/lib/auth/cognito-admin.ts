/**
 * AWS Cognito Admin Operations (Server-side only)
 *
 * Uses the AWS SDK to perform admin-level Cognito operations
 * like looking up users by email and deleting accounts.
 */

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const region = process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-2'
const userPoolId = process.env.COGNITO_USER_POOL_ID

let client: CognitoIdentityProviderClient | null = null

function getClient(): CognitoIdentityProviderClient {
  if (!client) {
    client = new CognitoIdentityProviderClient({ region })
  }
  return client
}

export interface CognitoUserAttributes {
  sub: string
  email: string
  givenName?: string
  familyName?: string
  status: string
}

/**
 * Get a Cognito user's attributes by username (email).
 * Returns null if the user doesn't exist.
 */
export async function adminGetCognitoUser(
  username: string
): Promise<CognitoUserAttributes | null> {
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is not configured')
  }

  try {
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    })

    const response = await getClient().send(command)

    const attrs = response.UserAttributes || []
    const getAttr = (name: string) => attrs.find((a) => a.Name === name)?.Value

    return {
      sub: getAttr('sub') || '',
      email: getAttr('email') || username,
      givenName: getAttr('given_name'),
      familyName: getAttr('family_name'),
      status: response.UserStatus || 'UNKNOWN',
    }
  } catch (error: unknown) {
    const err = error as Error & { name?: string }
    if (err.name === 'UserNotFoundException') {
      return null
    }
    throw error
  }
}

/**
 * Delete a Cognito user by username (email).
 * Returns true if deleted, false if user was not found.
 */
export async function adminDeleteCognitoUser(
  username: string
): Promise<boolean> {
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is not configured')
  }

  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    })

    await getClient().send(command)
    return true
  } catch (error: unknown) {
    const err = error as Error & { name?: string }
    if (err.name === 'UserNotFoundException') {
      return false
    }
    throw error
  }
}
