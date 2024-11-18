/**
 *
 * Access token returned by your driver implementation. An access
 * token must have "token" and "type" properties and you may
 * define additional properties (if needed)
 */

export type VkDriverAccessToken = {
  token: string
  type: 'bearer'
  refresh_token: string
  access_token: string
  id_token: string
  token_type: string
  expires_in: number
  user_id: number
  state: string
  scope: string
}

export type VkDriverScopes =
  | 'vkid.personal_info'
  | 'notify'
  | 'friends'
  | 'photos'
  | 'audio'
  | 'video'
  | 'stories'
  | 'pages'
  | 'menu'
  | 'status'
  | 'notes'
  | 'messages'
  | 'wall'
  | 'ads'
  | 'offline'
  | 'docs'
  | 'groups'
  | 'notifications'
  | 'stats'
  | 'email'
  | 'market'
  | 'phone_number'

export type VkDriverConfig = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
  scopes?: VkDriverScopes[]
  vkIdProvider?: 'vkid' | 'ok_ru' | 'mail_ru'
  langId?: 0 | 1 | 3 | 4 | 6 | 15 | 16 | 82
}

export type VkUserInfoResponse = {
  user: {
    user_id: string
    first_name: string
    last_name: string
    phone: string
    avatar: string
    email: string
    sex: number
    verified: boolean
    birthday: string
  }
}
