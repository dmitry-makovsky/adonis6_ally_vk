# AdonisJS 6 Ally Vk Driver

A Vk.com (Vkontakte.ru) driver for [AdonisJS Ally](https://docs.adonisjs.com/guides/social-auth).

## Getting started

### 1. Install the package

Install the package from your command line.

```bash
npm i adonis6-ally-vk
```
or
```bash
yarn add adonis6-ally-vk
```

### 2. Add ENV variables to your `./start/env.ts` file for validation

```typescript
...
  VK_CLIENT_ID: Env.schema.string(),
  VK_CLIENT_SECRET: Env.schema.string(),
```

### 3. Add ENV variables to your `.env` file, and optionally to your `.env.example` file

```bash
VK_CLIENT_ID=your_client_id
VK_CLIENT_SECRET=your_client_secret
```

### 4. Add the provider to allyConfig in your `./config/ally.ts` file

```typescript
import { VkDriverService } from 'adonis6_ally_vk'

const allyConfig = defineConfig({
  ...
  vk: VkDriverService({
    clientId: env.get('VK_CLIENT_ID'),
    clientSecret: env.get('VK_CLIENT_SECRET'),
    // Define here your callback URL, e.g.:
    callbackUrl: `${env.get('APP_URL')}/auth/vk/callback`,

    //
    // Additional options
    //
    // Use additional scopes if needed (default: ['vkid.personal_info', 'email'])
    // e.g:
    scopes: ['email', 'phone'],
    // All available scopes: https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/work-with-user-info/scopes

    // Use custom Vk ID provider (default: 'vkid'). Can be: vkid, ok_ru, mail_ru
    vkIdProvider: 'vkid',

    // Use custom language (default: '0' (rus)). Can be: 0 (rus), 1 (ukr), 3 (eng), 4 (spa), 6 (german), 15 (pol), 16 (fra), 82 (turkey)
    langId: 0,

    // Use custom url getting user info (default: 'https://id.vk.com/oauth2/user_info'):
    userInfoUrl: 'https://id.vk.com/oauth2/user_info',

    // Use custom url getting access token (default: 'https://id.vk.com/oauth2/auth') e.g.:
    accessTokenUrl: 'https://id.vk.com/oauth2/auth',

    // Use custom url getting authorize token (default: 'https://id.vk.com/authorize') e.g.:
    authorizeUrl: 'https://id.vk.com/authorize',
  }),
  ...
})
```


