export interface XboxServiceTokenResponse {
  IssueInstant: string
  NotAfter: string
  Token: string
  DisplayClaims: DisplayClaim
}

export interface DisplayClaim {
  xui: {
    uhs: string
    xid: string
    gtg: string
  }[]
}

export interface MCTokenResponse {
  username: string
  roles: any[]
  access_token: string
  token_type: string
  expires_in: number
}

export interface MinecraftUserResponse {
  xuid: string
  gamertag: string
  premium: boolean
  token: MCTokenResponse
  id?: string
  name?: string
  skins?: [
    {
      id: string
      variant: string
      url: string
      state: string
      alias?: string
    }
  ]
  capes?: [
    {
      id: string
      url: string
      state: string
      alias: string
    }
  ]
  profileActions?: any
  createdAt?: string
}
