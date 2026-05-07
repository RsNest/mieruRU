'use client'

import { Copy } from 'lucide-react'
import type { LogEntry } from '@/lib/types'
import { Button } from '@/components/ui/Button'

type LogRowProps = {
  entry: LogEntry
  expanded: boolean
  onToggleExpand: (seq: number) => void
}

export function LogRow({ entry, expanded, onToggleExpand }: LogRowProps) {
  const jsonMessage = parseJSON(entry.message)
  const isJson = jsonMessage !== null
  const line = formatLine(entry)

  return (
    <div
      className={`log-row-v2 level-${entry.level.toLowerCase()} ${expanded ? 'expanded' : ''}`}
      onClick={() => {
        if (isJson) onToggleExpand(entry.seq)
      }}
      role={isJson ? 'button' : undefined}
      tabIndex={isJson ? 0 : undefined}
      onKeyDown={(event) => {
        if (!isJson) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggleExpand(entry.seq)
        }
      }}
    >
      <span className="log-time-v2">{formatTime(entry.time)}</span>
      <span className={`log-level-v2 level-${entry.level.toLowerCase()}`}>{entry.level}</span>
      <span className="log-source-v2">{`[${entry.source || '-'}]`}</span>
      <span className="log-message-v2">{entry.message}</span>
      <Button
        type="button"
        variant="ghost"
        size="compact"
        className="log-copy-btn"
        aria-label="Copy log line"
        onClick={(event) => {
          event.stopPropagation()
          void navigator.clipboard.writeText(line)
        }}
      >
        <Copy size={14} />
      </Button>
    </div>
  )
}

export function parseJSON(message: string): unknown | null {
  try {
    return JSON.parse(message)
  } catch {
    return null
  }
}

export function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    const mmm = String(d.getMilliseconds()).padStart(3, '0')
    return `${hh}:${mm}:${ss}.${mmm}`
  } catch {
    return iso
  }
}

export function formatLine(entry: LogEntry): string {
  return `[${entry.time.replace('T', ' ').replace('Z', '')}] [${entry.level}] [${entry.source || '-'}] ${entry.message}`
}
