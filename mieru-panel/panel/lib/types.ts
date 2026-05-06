export type Theme = 'midnight' | 'sakura' | 'ghost' | 'daylight' | 'solar' | 'cyber' | 'auto'
export type Lang = 'ru' | 'en' | 'zh'

export type DeviceFingerprint = {
  hash: string
  hwid?: string
  userAgent?: string
  ip?: string
  firstSeen: number
  lastSeen: number
}

export type SubSecurity = {
  allowedUserAgents: string[]
  requireHWID: boolean
  defaultsList: string[]
}

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
  /** Maximum allowed concurrent devices; 0 means unlimited. */
  maxDevices?: number
  /** List of devices that have already fetched the subscription. */
  devices?: DeviceFingerprint[]
}

export type AuditEntry = {
  time: string
  action: string
  actor?: string
  target?: string
  ip?: string
  result?: string
  fields?: Record<string, unknown>
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