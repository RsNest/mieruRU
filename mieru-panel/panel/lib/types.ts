export type Theme = 'midnight' | 'sakura' | 'ghost' | 'daylight'
export type Lang = 'ru' | 'en' | 'zh'

export type User = {
  name: string
  password?: string
  subToken: string
  quotaDayMB: number
  quotaMonMB: number
  trafficDay?: string
  trafficMon?: string
  /** ISO timestamp of the last upload/download seen by mita. */
  lastActive?: string
  /** Unix seconds; 0 means "never expires". */
  expiresAt?: number
  expired?: boolean
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

export type AdvancedSettings = {
  loggingLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  mtu: number
  multiplexing:
    | 'MULTIPLEXING_OFF'
    | 'MULTIPLEXING_LOW'
    | 'MULTIPLEXING_MIDDLE'
    | 'MULTIPLEXING_HIGH'
}

export type ConnectionInfo = {
  sessionId: string
  protocol: string
  local: string
  remote: string
  state: string
  recvQ: string
  sendQ: string
  lastRecv: string
  lastSend: string
}