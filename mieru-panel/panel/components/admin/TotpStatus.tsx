'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { StatusPill } from '@/components/ui/StatusPill'
import { useToast } from '../useToast'
import { TotpSetup } from './TotpSetup'

type Status = { enabled: boolean; backupCodesRemaining: number }

export function TotpStatus() {
	const { t } = useTranslation()
	const { success } = useToast()
	const [status, setStatus] = useState<Status | null>(null)
	const [loadErr, setLoadErr] = useState('')
	const [wizardOpen, setWizardOpen] = useState(false)
	const [disableOpen, setDisableOpen] = useState(false)
	const [regenOpen, setRegenOpen] = useState(false)
	const [password, setPassword] = useState('')
	const [code, setCode] = useState('')
	const [busy, setBusy] = useState(false)
	const [inlineErr, setInlineErr] = useState('')
	const [newBackups, setNewBackups] = useState<string[] | null>(null)

	const fetchStatus = useCallback(async () => {
		setLoadErr('')
		try {
			const s = await api.get2FAStatus()
			setStatus(s)
		} catch (e) {
			setLoadErr((e as Error).message || t('toast_error'))
		}
	}, [t])

	useEffect(() => {
		void fetchStatus()
	}, [fetchStatus])

	const resetModalFields = () => {
		setPassword('')
		setCode('')
		setInlineErr('')
		setBusy(false)
		setNewBackups(null)
	}

	const openDisable = () => {
		resetModalFields()
		setDisableOpen(true)
	}

	const openRegen = () => {
		resetModalFields()
		setRegenOpen(true)
	}

	const submitDisable = async (ev: FormEvent) => {
		ev.preventDefault()
		setBusy(true)
		setInlineErr('')
		try {
			await api.disable2FA(password, code.trim())
			success(t('auth.2fa.toast_disabled'))
			setDisableOpen(false)
			resetModalFields()
			await fetchStatus()
		} catch (e) {
			setInlineErr((e as Error).message || t('toast_error'))
		} finally {
			setBusy(false)
		}
	}

	const submitRegen = async (ev: FormEvent) => {
		ev.preventDefault()
		setBusy(true)
		setInlineErr('')
		try {
			const { backupCodes } = await api.regenerate2FABackup(password, code.trim())
			setNewBackups(backupCodes)
			success(t('auth.2fa.toast_regenerated'))
			await fetchStatus()
		} catch (e) {
			setInlineErr((e as Error).message || t('toast_error'))
		} finally {
			setBusy(false)
		}
	}

	const downloadTxt = (lines: string[]) => {
		const body = `${lines.join('\n')}\n`
		const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'mieru-panel-2fa-backup-codes.txt'
		a.click()
		URL.revokeObjectURL(url)
	}

	if (!status && !loadErr) {
		return <p className="totp-status-muted">{t('auth.2fa.loading')}</p>
	}
	if (loadErr) {
		return (
			<div className="totp-status-muted">
				<p>{loadErr}</p>
				<Button type="button" variant="ghost" size="sm" onClick={() => void fetchStatus()}>
					{t('users_retry')}
				</Button>
			</div>
		)
	}

	if (!status) {
		return null
	}

	const enabled = status.enabled

	return (
		<div className="totp-status-root">
			{!enabled ? (
				<div className="totp-status-muted totp-status-idle-card">
					<p>{t('auth.2fa.not_configured')}</p>
					<Button type="button" variant="primary" onClick={() => setWizardOpen(true)}>
						{t('auth.2fa.enable_cta')}
					</Button>
				</div>
			) : (
				<div className="totp-status-active">
					<div className="totp-status-row">
						<StatusPill label={t('auth.2fa.active_pill')} tone="success" withDot />
						<span className="totp-backup-line">{t('auth.2fa.backup_remaining', { count: status.backupCodesRemaining })}</span>
					</div>
					<div className="totp-status-actions">
						<Button type="button" variant="ghost" size="sm" onClick={() => openRegen()}>
							{t('auth.2fa.regenerate')}
						</Button>
						<Button type="button" variant="ghost" size="sm" onClick={() => openDisable()}>
							{t('auth.2fa.disable')}
						</Button>
					</div>
				</div>
			)}

			<TotpSetup
				open={wizardOpen}
				onClose={() => setWizardOpen(false)}
				onFinished={() => {
					void fetchStatus()
					success(t('auth.2fa.toast_enabled'))
				}}
			/>

			{disableOpen ? (
				<div className="modal-backdrop" role="presentation" onMouseDown={() => setDisableOpen(false)}>
					<div
						className="modal"
						role="dialog"
						aria-modal
						onMouseDown={(e) => e.stopPropagation()}
					>
						<div className="modal-head">
							<h3 className="modal-title">{t('auth.2fa.modal_disable_title')}</h3>
							<button
								type="button"
								className="modal-close-btn"
								onClick={() => {
									setDisableOpen(false)
									resetModalFields()
								}}
								aria-label={t('modal_cancel')}
							>
								×
							</button>
						</div>
						<form className="modal-form" onSubmit={(e) => void submitDisable(e)}>
							<div className="field">
								<label htmlFor="totp-disable-pass">{t('auth.2fa.modal_password')}</label>
								<input
									id="totp-disable-pass"
									type="password"
									autoComplete="current-password"
									value={password}
									disabled={busy}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
							<div className="field">
								<label htmlFor="totp-disable-code">{t('auth.2fa.modal_code')}</label>
								<input
									id="totp-disable-code"
									type="text"
									inputMode="numeric"
									autoComplete="one-time-code"
									value={code}
									disabled={busy}
									onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
								/>
							</div>
							{inlineErr ? <p className="field-error">{inlineErr}</p> : null}
							<div className="modal-actions">
								<Button
									type="button"
									variant="ghost"
									onClick={() => {
										setDisableOpen(false)
										resetModalFields()
									}}
									disabled={busy}
								>
									{t('modal_cancel')}
								</Button>
								<Button type="submit" variant="danger" disabled={busy}>
									{busy ? t('app_loading') : t('auth.2fa.modal_confirm')}
								</Button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			{regenOpen ? (
				<div className="modal-backdrop" role="presentation" onMouseDown={() => setRegenOpen(false)}>
					<div
						className="modal"
						role="dialog"
						aria-modal
						onMouseDown={(e) => e.stopPropagation()}
					>
						<div className="modal-head">
							<h3 className="modal-title">{t('auth.2fa.modal_regenerate_title')}</h3>
							<button
								type="button"
								className="modal-close-btn"
								onClick={() => {
									setRegenOpen(false)
									resetModalFields()
								}}
								aria-label={t('modal_cancel')}
							>
								×
							</button>
						</div>
						{newBackups ? (
							<div className="modal-form">
								<p className="totp-setup-backups-hint">{t('auth.2fa.setup_backups_hint')}</p>
								<ul className="totp-backup-list">
									{newBackups.map((c) => (
										<li key={c}>
											<code>{c}</code>
										</li>
									))}
								</ul>
								<div className="modal-actions totp-backup-actions">
									<Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(newBackups.join('\n'))}>
										{t('auth.2fa.setup_copy_all')}
									</Button>
									<Button type="button" variant="secondary" onClick={() => downloadTxt(newBackups)}>
										{t('auth.2fa.setup_download_txt')}
									</Button>
									<Button
										type="button"
										variant="primary"
										onClick={() => {
											setRegenOpen(false)
											resetModalFields()
										}}
									>
										{t('auth.2fa.done')}
									</Button>
								</div>
							</div>
						) : (
							<form className="modal-form" onSubmit={(e) => void submitRegen(e)}>
								<div className="field">
									<label htmlFor="totp-regen-pass">{t('auth.2fa.modal_password')}</label>
									<input
										id="totp-regen-pass"
										type="password"
										autoComplete="current-password"
										value={password}
										disabled={busy}
										onChange={(e) => setPassword(e.target.value)}
									/>
								</div>
								<div className="field">
									<label htmlFor="totp-regen-code">{t('auth.2fa.modal_code')}</label>
									<input
										id="totp-regen-code"
										type="text"
										inputMode="numeric"
										autoComplete="one-time-code"
										value={code}
										disabled={busy}
										onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
									/>
								</div>
								{inlineErr ? <p className="field-error">{inlineErr}</p> : null}
								<div className="modal-actions">
									<Button
										type="button"
										variant="ghost"
										onClick={() => {
											setRegenOpen(false)
											resetModalFields()
										}}
										disabled={busy}
									>
										{t('modal_cancel')}
									</Button>
									<Button type="submit" variant="primary" disabled={busy}>
										{busy ? t('app_loading') : t('auth.2fa.modal_confirm')}
									</Button>
								</div>
							</form>
						)}
					</div>
				</div>
			) : null}
		</div>
	)
}
