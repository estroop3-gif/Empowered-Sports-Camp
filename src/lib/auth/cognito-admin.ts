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
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
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
/**
 * Create a Cognito user with suppressed welcome email (we send our own).
 * If user already exists, falls back to getting the existing user's sub.
 * Returns the Cognito sub and whether the user was newly created.
 */
export async function adminCreateCognitoUser(
  email: string,
  firstName: string,
  lastName: string
): Promise<{ sub: string; isNew: boolean }> {
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is not configured')
  }

  try {
    const command = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
      ],
    })

    const response = await getClient().send(command)
    const attrs = response.User?.Attributes || []
    const sub = attrs.find((a) => a.Name === 'sub')?.Value

    if (!sub) {
      throw new Error('Cognito user created but no sub returned')
    }

    return { sub, isNew: true }
  } catch (error: unknown) {
    const err = error as Error & { name?: string }
    if (err.name === 'UsernameExistsException') {
      const existing = await adminGetCognitoUser(email)
      if (!existing) {
        throw new Error('User exists in Cognito but could not be retrieved')
      }
      return { sub: existing.sub, isNew: false }
    }
    throw error
  }
}

/**
 * Set a permanent password for a Cognito user (avoids FORCE_CHANGE_PASSWORD state).
 */
export async function adminSetCognitoUserPassword(
  username: string,
  password: string
): Promise<void> {
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is not configured')
  }

  const command = new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: username,
    Password: password,
    Permanent: true,
  })

  await getClient().send(command)
}

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
