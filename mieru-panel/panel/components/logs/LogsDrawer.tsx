'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLogBuffer } from '@/hooks/useLogBuffer'
import { useUIStore } from '@/store/ui'
import { Button } from '@/components/ui/Button'
import { AuditList } from '@/components/logs/AuditList'
import { formatLine } from '@/components/logs/LogRow'
import { LogStream } from '@/components/logs/LogStream'
import { LogToolbar } from '@/components/logs/LogToolbar'
import { MitaLogsSection } from '@/components/logs/MitaLogsSection'

type DrawerTab = 'logs' | 'mita' | 'audit'

export function LogsDrawer() {
  const { t } = useTranslation()
  const open = useUIStore((s) => s.logsDrawerOpen)
  const closeLogs = useUIStore((s) => s.closeLogs)
  const [tab, setTab] = useState<DrawerTab>('logs')
  const [autoScroll, setAutoScroll] = useState(true)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const {
    filtered,
    filter,
    setFilter,
    search,
    setSearch,
    clear,
    paused,
    togglePause,
  } = useLogBuffer({ pollMs: 2000, maxSize: 1000, enabled: open })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLogs()
        return
      }
      if (tab !== 'logs') return
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, closeLogs, tab])

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
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="logs-drawer-overlay"
            type="button"
            className="logs-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-label={t('mobile_menu_close')}
            onClick={() => closeLogs()}
          />
          <motion.aside
            key="logs-drawer-panel"
            className="logs-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav_logs')}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="logs-drawer-head">
              <h2 className="logs-drawer-title">{t('nav_logs')}</h2>
              <Button type="button" variant="ghost" size="compact" aria-label={t('mobile_menu_close')} onClick={() => closeLogs()}>
                <X size={18} />
              </Button>
            </div>
            <div className="logs-drawer-tabs logs-segmented" role="tablist" aria-label={t('nav_logs')}>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'logs'}
                className={`logs-segment ${tab === 'logs' ? 'active' : ''}`}
                onClick={() => setTab('logs')}
              >
                {t('tab_logs')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'mita'}
                className={`logs-segment ${tab === 'mita' ? 'active' : ''}`}
                onClick={() => setTab('mita')}
              >
                {t('logs_mita_title')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'audit'}
                className={`logs-segment ${tab === 'audit' ? 'active' : ''}`}
                onClick={() => setTab('audit')}
              >
                {t('audit_title')}
              </button>
            </div>
            <div className="logs-drawer-body">
              {tab === 'logs' ? (
                <>
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
                </>
              ) : null}
              {tab === 'mita' ? <MitaLogsSection /> : null}
              {tab === 'audit' ? <AuditList /> : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
