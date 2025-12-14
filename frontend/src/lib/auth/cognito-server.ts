/**
 * AWS Cognito Server-side Verification
 *
 * Handles JWT verification for API routes and middleware.
 * Uses aws-jwt-verify for secure token validation.
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { cookies } from 'next/headers'

interface CognitoIdTokenPayload {
  sub: string
  email: string
  email_verified: boolean
  'cognito:username': string
  'cognito:groups'?: string[]
  'custom:role'?: string
  'custom:tenant_id'?: string
  given_name?: string
  family_name?: string
  iat: number
  exp: number
  aud: string
  iss: string
}

export interface VerifiedUser {
  id: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  groups: string[]
  role?: string
  tenantId?: string
}

// Create the JWT verifier (cached between requests)
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null

function getVerifier() {
  if (!verifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID
    const clientId = process.env.COGNITO_CLIENT_ID

    if (!userPoolId || !clientId) {
      throw new Error('Cognito configuration missing. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID')
    }

    verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId,
    })
  }
  return verifier
}

/**
 * Verify JWT token from Authorization header or cookie
 */
export async function verifyToken(token: string): Promise<VerifiedUser | null> {
  try {
    const payload = await getVerifier().verify(token) as unknown as CognitoIdTokenPayload

    return {
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      firstName: payload.given_name,
      lastName: payload.family_name,
      groups: payload['cognito:groups'] || [],
      role: payload['custom:role'],
      tenantId: payload['custom:tenant_id'],
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Get authenticated user from cookies (for server components)
 */
export async function getAuthenticatedUser(): Promise<VerifiedUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('id_token')?.value

  if (!token) {
    return null
  }

  return verifyToken(token)
}

/**
 * Get authenticated user from request headers (for API routes)
 */
export async function getAuthenticatedUserFromRequest(
  request: Request
): Promise<VerifiedUser | null> {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    return verifyToken(token)
  }

  // Fall back to cookie
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => c.split('='))
    )
    const token = cookies['id_token']
    if (token) {
      return verifyToken(token)
    }
  }

  return null
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<VerifiedUser> {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require specific role - throws if not authorized
 */
export async function requireRole(allowedRoles: string[]): Promise<VerifiedUser> {
  const user = await requireAuth()

  if (!user.role || !allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }

  return user
}

/**
 * Check if user has specific role
 */
export async function hasRole(roles: string[]): Promise<boolean> {
  try {
    const user = await getAuthenticatedUser()
    return user?.role ? roles.includes(user.role) : false
  } catch {
    return false
  }
}

/**
 * Exchange authorization code for tokens (OAuth callback)
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  id_token: string
  refresh_token?: string
  expires_in: number
} | null> {
  const region = process.env.AWS_REGION || 'us-east-2'
  const userPoolId = process.env.COGNITO_USER_POOL_ID
  const clientId = process.env.COGNITO_CLIENT_ID
  const clientSecret = process.env.COGNITO_CLIENT_SECRET
  const redirectUri = process.env.COGNITO_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`

  if (!userPoolId || !clientId) {
    console.error('Cognito configuration missing')
    return null
  }

  // Extract the domain prefix from the user pool ID (format: region_xxxxx)
  const poolIdParts = userPoolId.split('_')
  const domainPrefix = process.env.COGNITO_DOMAIN || `empowered-${poolIdParts[1]?.toLowerCase()}`

  const tokenUrl = `https://${domainPrefix}.auth.${region}.amazoncognito.com/oauth2/token`

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  // If client secret is configured, add Basic auth
  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    headers['Authorization'] = `Basic ${credentials}`
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange failed:', response.status, errorText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Token exchange error:', error)
    return null
  }
}
