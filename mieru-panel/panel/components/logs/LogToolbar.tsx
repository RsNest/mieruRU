'use client'

import type React from 'react'
import type { RefObject } from 'react'
import type { LogLevel } from '@/lib/types'
import { Button } from '@/components/ui/Button'

type FilterLevel = LogLevel | 'ALL'

type LogToolbarProps = {
  filter: FilterLevel
  setFilter: React.Dispatch<React.SetStateAction<FilterLevel>>
  search: string
  setSearch: (value: string) => void
  paused: boolean
  togglePause: () => void
  autoScroll: boolean
  toggleAutoScroll: () => void
  clear: () => void
  download: () => void
  searchRef: RefObject<HTMLInputElement | null>
}

const LEVELS: FilterLevel[] = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR']

export function LogToolbar({
  filter,
  setFilter,
  search,
  setSearch,
  paused,
  togglePause,
  autoScroll,
  toggleAutoScroll,
  clear,
  download,
  searchRef,
}: LogToolbarProps) {
  return (
    <div className="logs-toolbar-v2">
      <div className="logs-segmented">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={`logs-segment ${filter === level ? 'active' : ''}`}
            onClick={() => setFilter(level)}
          >
            {level}
          </button>
        ))}
      </div>

      <input
        ref={searchRef}
        className="logs-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search ⌘K"
      />

      <div className="logs-toolbar-actions">
        <button type="button" className={`logs-toggle ${paused ? 'on' : ''}`} onClick={togglePause}>
          ⏸
        </button>
        <button type="button" className={`logs-toggle ${autoScroll ? 'on' : ''}`} onClick={toggleAutoScroll}>
          ↺
        </button>
        <Button type="button" variant="secondary" size="compact" onClick={clear} aria-label="Clear log buffer">
          ⌫
        </Button>
        <Button type="button" variant="secondary" size="compact" onClick={download} aria-label="Download filtered logs">
          ⬇
        </Button>
      </div>
    </div>
  )
}
