import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { RedirectRequestContract } from '@ioc:Adonis/Addons/Ally'
import { Oauth2Driver } from '@adonisjs/ally/build/standalone'
import { ofetch } from 'ofetch'
import { MCTokenResponse, XboxServiceTokenResponse, MinecraftUserResponse } from './interfaces'

export type MinecraftDriverAccessToken = {
  token: string
  type: 'bearer'
}

export type MinecraftDriverScopes = 'XboxLive.signin'

export type MinecraftDriverConfig = {
  driver: 'minecraft'
  clientId: string
  clientSecret: string
  callbackUrl: string
}

export class MinecraftDriver extends Oauth2Driver<
  MinecraftDriverAccessToken,
  MinecraftDriverScopes
> {
  protected authorizeUrl = 'https://login.live.com/oauth20_authorize.srf'

  protected accessTokenUrl = 'https://login.live.com/oauth20_token.srf'

  protected codeParamName = 'code'

  protected errorParamName = 'error'

  protected stateCookieName = 'MinecraftDriver_oauth_state'

  protected stateParamName = 'state'

  protected scopeParamName = 'scope'

  protected scopesSeparator = ' '

  constructor(ctx: HttpContextContract, public config: MinecraftDriverConfig) {
    super(ctx, config)

    this.loadState()
  }

  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  protected configureRedirectRequest(request: RedirectRequestContract<MinecraftDriverScopes>) {
    request.param('response_type', 'code')
    request.param('scope', 'XboxLive.signin offline_access')
  }

  public async GetUserInfo(token: string): Promise<MinecraftUserResponse> {
    try {
      const XBLToken = await this.TokenIntoXBL(token)

      const xboxProfile: XboxServiceTokenResponse = await this.XBLintoXSTS(
        XBLToken,
        'http://xboxlive.com'
      )

      const mcToken: MCTokenResponse = await this.XSTSintoMinecraft(
        await this.XBLintoXSTS(XBLToken, 'rp://api.minecraftservices.com/')
      )

      const basicOptions = {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mcToken.access_token}`,
        },
      }
      const checkOwnership = await ofetch(
        'https://api.minecraftservices.com/entitlements/mcstore',
        basicOptions
      ) //.catch((err) => console.error('[ALLY-Minecraft-Driver] checkOwnership error ' + err))

      if (!checkOwnership?.items.length)
        return {
          xuid: xboxProfile.DisplayClaims.xui[0]?.xid,
          gamertag: xboxProfile.DisplayClaims.xui[0]?.gtg,
          premium: false,
          token: mcToken,
        }

      const nameChange = await ofetch(
        'https://api.minecraftservices.com/minecraft/profile/namechange',
        basicOptions
      ) //.catch((err) => console.error('[ALLY-Minecraft-Driver] nameChange error ' + err))

      const mcProfile = await ofetch(
        'https://api.minecraftservices.com/minecraft/profile',
        basicOptions
      ) //.catch((err) => console.error('[ALLY-Minecraft-Driver] mcProfile error' + err))

      mcProfile.token = mcToken
      mcProfile.premium = true
      mcProfile.createdAt = nameChange.createdAt
      mcProfile.xuid = xboxProfile.DisplayClaims.xui[0]?.xid
      mcProfile.gamertag = xboxProfile.DisplayClaims.xui[0]?.gtg

      return mcProfile
    } catch (err) {
      throw new Error('[ALLY-Minecraft-Driver] error during getting user data')
    }
  }

  // @ts-ignore
  public async user(): Promise<MinecraftUserResponse> {
    try {
      const accessToken = await this.accessToken()
      return this.GetUserInfo(accessToken.token)
    } catch (err) {
      throw new Error('[ALLY-Minecraft-Driver] error ' + err)
    }
  }

  // @ts-ignore
  public async userFromToken(accessToken: string): Promise<MinecraftUserResponse> {
    return this.GetUserInfo(accessToken)
  }

  protected TokenToXBL = 'https://user.auth.xboxlive.com/user/authenticate'
  protected XblToXSTS = 'https://xsts.auth.xboxlive.com/xsts/authorize'
  protected XstsToMinecraft = 'https://api.minecraftservices.com/authentication/login_with_xbox'

  public async TokenIntoXBL(accessToken: string): Promise<XboxServiceTokenResponse> {
    const data = {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${accessToken}`,
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    }
    const options = {
      body: data,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }
    const response: Promise<XboxServiceTokenResponse> = ofetch(this.TokenToXBL, options) //.catch((err) => console.error('[ALLY-Minecraft-Driver] TokenIntoXBL error: ' + err))
    return response
  }

  public async XBLintoXSTS(
    token: XboxServiceTokenResponse,
    RelyingParty: 'rp://api.minecraftservices.com/' | 'http://xboxlive.com'
  ): Promise<XboxServiceTokenResponse> {
    const data = {
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [token.Token],
      },
      RelyingParty: RelyingParty,
      TokenType: 'JWT',
    }
    const options = {
      body: data,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }
    const response: Promise<XboxServiceTokenResponse> = ofetch(this.XblToXSTS, options) //.catch((err) => console.error('[ALLY-Minecraft-Driver] XBLintoXSTS error: ' + err))
    return response
  }

  public async XSTSintoMinecraft(token: XboxServiceTokenResponse): Promise<MCTokenResponse> {
    const data = {
      ensureLegacyEnabled: true,
      identityToken: `XBL3.0 x=${token.DisplayClaims.xui[0].uhs};${token.Token}`,
    }
    const options = {
      body: data,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }
    const response: Promise<MCTokenResponse> = ofetch(this.XstsToMinecraft, options) //.catch((err) =>console.error('[ALLY-Minecraft-Driver] XSTSintoMinecraft error: ' + err))
    return response
  }
}
