/*
|--------------------------------------------------------------------------
| Ally Vk Oauth driver
|--------------------------------------------------------------------------
|
| This is an Ally driver for authenticating users via Vk.
|
*/

import { type ApiRequest, Oauth2Driver } from '@adonisjs/ally'
import type { HttpContext } from '@adonisjs/core/http'
import type {
  AllyDriverContract,
  AllyUserContract,
  ApiRequestContract,
  RedirectRequestContract,
} from '@adonisjs/ally/types'
import type { RedirectRequestContract as PoppinssRedirectRequestContract } from '@poppinss/oauth-client/types'
import type {
  VkDriverAccessToken,
  VkDriverScopes,
  VkDriverConfig,
  VkUserInfoResponse,
} from './types.ts'

/**
 * Driver implementation. It is mostly configuration driven except the API call
 * to get user info.
 */
export class VkDriver
  extends Oauth2Driver<VkDriverAccessToken, VkDriverScopes>
  implements AllyDriverContract<VkDriverAccessToken, VkDriverScopes>
{
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   */
  protected authorizeUrl = 'https://id.vk.com/authorize'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   */
  protected accessTokenUrl = 'https://id.vk.com/oauth2/auth'

  /**
   * The URL to hit to get the user details
   *
   */
  protected userInfoUrl = 'https://id.vk.com/oauth2/user_info'

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'vk_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  protected codeVerifier: string

  /**
   * Get the code verifier for PKCE
   */
  private getCodeVerifier(): string {
    const cookieVerifier = this.ctx.request.cookie('vk_code_verifier')
    if (cookieVerifier) {
      return cookieVerifier
    }
    const codeVerifier = [...Array(128)].map(() => ((Math.random() * 36) | 0).toString(36)).join('')
    return codeVerifier
  }

  /**
   * Get the code challenge for PKCE
   */
  private async getCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    return codeChallenge
  }

  constructor(
    ctx: HttpContext,
    public config: VkDriverConfig
  ) {
    super(ctx, config)

    this.codeVerifier = this.getCodeVerifier()
    this.loadState()
  }

  /**
   * Returns the scopes as a string
   */
  private buildScopes(): string {
    const currentScopes = this.config.scopes || ['vkid.personal_info', 'email']
    return currentScopes.join(this.scopesSeparator)
  }

  /**
   * Returns the instance of the HTTP client for internal use
   */
  protected getAuthenticatedRequest(url: string, token: string): ApiRequest {
    const request = this.httpClient(url)
    request.post()
    request.field('client_id', this.config.clientId)
    request.field('access_token', token)
    request.header('Content-Type', 'application/x-www-form-urlencoded')
    request.parseAs('json')
    return request
  }

  /**
   * Get the user info using the access token
   */
  protected async getUserInfo(token: string, callback?: (request: ApiRequestContract) => void) {
    const request = this.getAuthenticatedRequest(this.config.userInfoUrl || this.userInfoUrl, token)
    if (typeof callback === 'function') {
      callback(request)
    }
    const response: VkUserInfoResponse = await request.post()
    return {
      id: response.user.user_id,
      nickName: response.user.first_name,
      name: `${response.user.first_name} ${response.user.last_name}`,
      email: response.user.email,
      emailVerificationState: 'unsupported' as const,
      avatarUrl: response.user.avatar,
      original: response,
    }
  }

  /**
   * Redirects the user for authorization. The method is invoked by the route handler
   */
  async redirectUrl(
    callback?: (request: RedirectRequestContract<VkDriverScopes>) => void
  ): Promise<string> {
    const url = this.getRedirectUrl(callback as (request: PoppinssRedirectRequestContract) => void)
    const codeChallenge = await this.getCodeChallenge(this.codeVerifier)
    this.ctx.response.cookie('vk_code_verifier', this.codeVerifier, {
      sameSite: 'lax',
      httpOnly: true,
    })
    const newUrl = new URL(url)
    newUrl.searchParams.append('response_type', 'code')
    newUrl.searchParams.append('code_challenge', codeChallenge)
    newUrl.searchParams.append('code_challenge_method', 'S256')
    newUrl.searchParams.append('scope', this.buildScopes())
    this.config.langId && newUrl.searchParams.append('lang_id', this.config.langId.toString())
    this.config.vkIdProvider &&
      newUrl.searchParams.append('vk_id_provider', this.config.vkIdProvider)
    return newUrl.toString()
  }

  /**
   * Find if the current error code is for access denied
   */
  accessDenied() {
    const error = this.getError()
    if (!error) {
      return false
    }
    return [
      'access_denied',
      'invalid_token',
      'server_error',
      'slow_down',
      'temporarily_unavailable',
      'invalid_client',
    ].includes(error)
  }

  /**
   * Configure the redirect request. Invoked before the user callback.
   */
  protected configureAccessTokenRequest(request: ApiRequest) {
    const { device_id: deviceId, code } = this.ctx.request.qs()
    request.param('grant_type', 'authorization_code')
    request.param('code_verifier', this.codeVerifier)
    request.param('redirect_uri', this.config.callbackUrl)
    request.param('code', code)
    request.param('device_id', deviceId)
  }

  /**
   * Returns details for the authorized user
   */
  async user(
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<VkDriverAccessToken>> {
    const accessToken = await this.accessToken()
    const user = await this.getUserInfo(accessToken.token, callback)
    return {
      ...user,
      token: accessToken,
    }
  }

  /**
   * Finds the user by the access token
   */
  async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const user = await this.getUserInfo(accessToken, callback)
    return {
      ...user,
      token: {
        token: accessToken,
        type: 'bearer',
      },
    }
  }
}

/**
 * The factory function to reference the driver implementation
 * inside the "config/ally.ts" file.
 */
export function VkDriverService(config: VkDriverConfig): (ctx: HttpContext) => VkDriver {
  return (ctx) => new VkDriver(ctx, config)
}
