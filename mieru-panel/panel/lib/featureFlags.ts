function readBooleanFlag(raw: string | undefined, defaultValue = false): boolean {
  if (typeof raw !== 'string') return defaultValue
  const normalized = raw.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export const featureFlags = {
  uiV2: readBooleanFlag(process.env.NEXT_PUBLIC_UI_V2, false),
} as const
