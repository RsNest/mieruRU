'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/ui/SectionCard'
import { useLogBuffer } from '@/hooks/useLogBuffer'
import { formatLine } from '@/components/logs/LogRow'
import { AuditList } from '@/components/logs/AuditList'
import { LogStream } from '@/components/logs/LogStream'
import { LogToolbar } from '@/components/logs/LogToolbar'
import { MitaLogsSection } from '@/components/logs/MitaLogsSection'

interface DashboardLogsTabProps {
  active: boolean
}

export function DashboardLogsTab({ active }: DashboardLogsTabProps) {
  const { t } = useTranslation()
  const {
    filtered,
    filter,
    setFilter,
    search,
    setSearch,
    clear,
    paused,
    togglePause,
  } = useLogBuffer({
    pollMs: 2000,
    maxSize: 1000,
    /** Legacy /logs tab: no polling until routing cleanup (stage 6); use TopBar → Logs drawer for live stream. */
    enabled: false,
  })
  const [autoScroll, setAutoScroll] = useState(true)
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])

  const filteredLines = useMemo(() => filtered.map((entry) => formatLine(entry)).join('\n'), [filtered])
  const onDownload = () => {
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)
    const blob = new Blob([filteredLines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mieru-panel-logs-${stamp}.log`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`tab-pane ${active ? 'active' : 'inactive'}`}>
      <SectionCard title={t('logs_title')} description={t('logs_hint')}>
        <LogToolbar
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          paused={paused}
          togglePause={togglePause}
          autoScroll={autoScroll}
          toggleAutoScroll={() => setAutoScroll((prev) => !prev)}
          clear={clear}
          download={onDownload}
          searchRef={searchRef}
        />
        <LogStream entries={filtered} autoScroll={autoScroll} setAutoScroll={setAutoScroll} />
      </SectionCard>
      <MitaLogsSection />
      <AuditList />
    </div>
  )
}
