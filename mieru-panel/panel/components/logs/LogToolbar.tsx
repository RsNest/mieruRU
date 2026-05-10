'use client'

import type React from 'react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        placeholder={t('logs_drawer.search_placeholder')}
      />

      <div className="logs-toolbar-actions">
        <button
          type="button"
          className={`logs-toggle ${paused ? 'on' : ''}`}
          onClick={togglePause}
          aria-label={paused ? t('logs_resume') : t('logs_pause')}
          title={paused ? t('logs_resume') : t('logs_pause')}
        >
          ⏸
        </button>
        <button
          type="button"
          className={`logs-toggle ${autoScroll ? 'on' : ''}`}
          onClick={toggleAutoScroll}
          aria-label={t('logs_drawer.autoscroll_aria')}
          title={t('logs_drawer.autoscroll_aria')}
        >
          ↺
        </button>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={clear}
          aria-label={t('logs_drawer.clear_aria')}
          title={t('logs_drawer.clear_aria')}
        >
          ⌫
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={download}
          aria-label={t('logs_drawer.download_aria')}
          title={t('logs_drawer.download_aria')}
        >
          ⬇
        </Button>
      </div>
    </div>
  )
}
