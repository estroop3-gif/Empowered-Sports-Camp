/**
 * AWS Cognito Client (Browser-side)
 *
 * Handles authentication operations using Amazon Cognito.
 * Uses amazon-cognito-identity-js for browser-based auth.
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
  ISignUpResult,
} from 'amazon-cognito-identity-js'

// Cognito configuration
const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
}

let userPool: CognitoUserPool | null = null

function getUserPool(): CognitoUserPool {
  if (!userPool) {
    if (!poolData.UserPoolId || !poolData.ClientId) {
      throw new Error('Cognito configuration missing. Set NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID')
    }
    userPool = new CognitoUserPool(poolData)
  }
  return userPool
}

export interface SignUpData {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
}

/**
 * Sign up a new user
 */
export function signUp(data: SignUpData): Promise<ISignUpResult> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()

    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'email', Value: data.email }),
    ]

    if (data.firstName) {
      attributeList.push(new CognitoUserAttribute({ Name: 'given_name', Value: data.firstName }))
    }
    if (data.lastName) {
      attributeList.push(new CognitoUserAttribute({ Name: 'family_name', Value: data.lastName }))
    }

    pool.signUp(data.email, data.password, attributeList, [], (err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result!)
    })
  })
}

/**
 * Confirm signup with verification code
 */
export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool })

    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

/**
 * Resend confirmation code
 */
export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool })

    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

/**
 * Sign in user
 */
export function signIn(data: SignInData): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()
    const cognitoUser = new CognitoUser({ Username: data.email, Pool: pool })

    const authDetails = new AuthenticationDetails({
      Username: data.email,
      Password: data.password,
    })

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve(session)
      },
      onFailure: (err) => {
        reject(err)
      },
      newPasswordRequired: () => {
        reject(new Error('New password required. Please reset your password.'))
      },
    })
  })
}

/**
 * Sign out current user
 */
export function signOut(): void {
  const pool = getUserPool()
  const cognitoUser = pool.getCurrentUser()
  if (cognitoUser) {
    cognitoUser.signOut()
  }
}

/**
 * Get current session (if logged in)
 */
export function getCurrentSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const pool = getUserPool()
    const cognitoUser = pool.getCurrentUser()

    if (!cognitoUser) {
      resolve(null)
      return
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        resolve(null)
        return
      }
      resolve(session)
    })
  })
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const pool = getUserPool()
  const cognitoUser = pool.getCurrentUser()

  if (!cognitoUser) {
    return null
  }

  return new Promise((resolve) => {
    // First get the session to authenticate the user
    cognitoUser.getSession((sessionErr: Error | null, session: CognitoUserSession | null) => {
      if (sessionErr || !session?.isValid()) {
        resolve(null)
        return
      }

      // Now get user attributes (user is authenticated with valid session)
      cognitoUser.getUserAttributes((err, attributes) => {
        if (err || !attributes) {
          resolve(null)
          return
        }

        const attrMap: Record<string, string> = {}
        attributes.forEach((attr) => {
          attrMap[attr.Name] = attr.Value
        })

        resolve({
          id: attrMap['sub'],
          email: attrMap['email'],
          emailVerified: attrMap['email_verified'] === 'true',
          firstName: attrMap['given_name'],
          lastName: attrMap['family_name'],
        })
      })
    })
  })
}

/**
 * Get ID token for API requests
 */
export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession()
  return session?.getIdToken().getJwtToken() ?? null
}

/**
 * Get access token for API requests
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession()
  return session?.getAccessToken().getJwtToken() ?? null
}

/**
 * Initiate forgot password flow
 */
export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool })

    cognitoUser.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

/**
 * Confirm new password with reset code
 */
export function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool })

    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    })
  })
}

/**
 * Change password for logged-in user
 */
export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool()
    const cognitoUser = pool.getCurrentUser()

    if (!cognitoUser) {
      reject(new Error('No user logged in'))
      return
    }

    cognitoUser.getSession((err: Error | null) => {
      if (err) {
        reject(err)
        return
      }

      cognitoUser.changePassword(oldPassword, newPassword, (changeErr) => {
        if (changeErr) {
          reject(changeErr)
          return
        }
        resolve()
      })
    })
  })
}

/**
 * Refresh the current session and sync cookies with server.
 * Returns true if the client-side session is valid, even if the
 * cookie sync fails (cookie sync is best-effort to avoid treating
 * a network blip as a session failure).
 */
export async function refreshAndSyncSession(): Promise<boolean> {
  const pool = getUserPool()
  const cognitoUser = pool.getCurrentUser()

  if (!cognitoUser) {
    return false
  }

  return new Promise((resolve) => {
    // getSession will automatically refresh tokens if needed
    cognitoUser.getSession(async (err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        resolve(false)
        return
      }

      // Session is valid — sync cookies as best-effort
      try {
        await fetch('/api/auth/set-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: session.getIdToken().getJwtToken(),
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken()?.getToken(),
            expiresIn: session.getIdToken().getExpiration() - Math.floor(Date.now() / 1000),
          }),
        })
      } catch {
        // Cookie sync failed but client-side session is still valid
        console.warn('[Auth] Cookie sync failed, client session still valid')
      }

      // Return true since the client session refreshed successfully
      resolve(true)
    })
  })
}

/**
 * Check if the session needs refresh (within 10 minutes of expiry)
 * More aggressive refresh to prevent session expiration issues
 */
export async function checkAndRefreshSession(): Promise<boolean> {
  const session = await getCurrentSession()
  if (!session) return false

  // Get expiration time
  const expiration = session.getIdToken().getExpiration()
  const now = Math.floor(Date.now() / 1000)
  const timeUntilExpiry = expiration - now

  // If less than 10 minutes until expiry, refresh proactively
  // This gives a larger buffer to prevent mid-operation expirations
  if (timeUntilExpiry < 600) {
    console.log('[Auth] Token expiring soon, refreshing...', { timeUntilExpiry })
    return refreshAndSyncSession()
  }

  return true
}
