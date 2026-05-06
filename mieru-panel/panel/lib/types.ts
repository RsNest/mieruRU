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

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export type LogEntry = {
  seq: number
  time: string
  level: LogLevel
  source?: string
  message: string
}

export type ServerConfig = {
  serverIP: string
  defaultPort: number
  serverPortRange: string
}