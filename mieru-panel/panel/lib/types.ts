export type Theme = 'midnight' | 'sakura' | 'ghost'
export type Lang = 'ru' | 'en' | 'zh'

export type User = {
  name: string
  password?: string
  subToken: string
  quotaDayMB: number
  quotaMonMB: number
  trafficDay?: string
  trafficMon?: string
}

export type ServerStatus = 'RUNNING' | 'IDLE' | string