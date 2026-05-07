'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogEntry } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LogRow, parseJSON } from './LogRow'

type LogStreamProps = {
  entries: LogEntry[]
  autoScroll: boolean
  setAutoScroll: (value: boolean) => void
}

const ROW_HEIGHT = 24

export function LogStream({ entries, autoScroll, setAutoScroll }: LogStreamProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const isProgrammaticScrollRef = useRef(false)
  const [hovering, setHovering] = useState(false)
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null)
  const expandedEntry = useMemo(() => entries.find((entry) => entry.seq === expandedSeq), [entries, expandedSeq])
  const expandedJson = useMemo(
    () => (expandedEntry ? parseJSON(expandedEntry.message) : null),
    [expandedEntry],
  )

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  const jumpToBottom = () => {
    const node = parentRef.current
    if (!node) return
    isProgrammaticScrollRef.current = true
    node.scrollTop = node.scrollHeight
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false
      }),
    )
    setAutoScroll(true)
  }

  useEffect(() => {
    if (!autoScroll || hovering) return
    const node = parentRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    if (distanceFromBottom < 80) {
      isProgrammaticScrollRef.current = true
      node.scrollTop = node.scrollHeight
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false
        }),
      )
    }
  }, [entries, autoScroll, hovering])

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No log entries yet."
        description="When logs arrive, they will stream here in real time."
      />
    )
  }

  return (
    <div className="log-stream-layout">
      <div className="log-stream-shell">
      <div
        className="log-stream-v2"
        ref={parentRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onScroll={(event) => {
          if (isProgrammaticScrollRef.current) return
          const node = event.currentTarget
          const distance = node.scrollHeight - node.scrollTop - node.clientHeight
          if (distance > 80 && autoScroll) setAutoScroll(false)
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const entry = entries[virtualRow.index]
            if (!entry) return null
            return (
              <div
                key={entry.seq}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                <LogRow
                  entry={entry}
                  expanded={expandedSeq === entry.seq}
                  onToggleExpand={(seq) => setExpandedSeq((prev) => (prev === seq ? null : seq))}
                />
              </div>
            )
          })}
        </div>
      </div>
      {!autoScroll ? (
        <Button type="button" variant="secondary" className="jump-bottom-btn" onClick={jumpToBottom}>
          Jump to bottom
        </Button>
      ) : null}
      </div>
      <div className="log-json-side">
        <h3>JSON detail</h3>
        {!expandedEntry ? (
          <p className="muted">Click a JSON log row to inspect payload.</p>
        ) : expandedJson ? (
          <pre className="log-json-detail">{JSON.stringify(expandedJson, null, 2)}</pre>
        ) : (
          <p className="muted">Selected row is plain text.</p>
        )}
      </div>
    </div>
  )
}
