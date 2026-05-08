'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'

type Props = {
	open: boolean
	onClose: () => void
	onFinished: () => void
}

type WizardStep = 0 | 1 | 2 | 3

export function TotpSetup({ open, onClose, onFinished }: Props) {
	const { t } = useTranslation()
	const [step, setStep] = useState<WizardStep>(0)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	const [qrUri, setQrUri] = useState('')
	const [secretPlain, setSecretPlain] = useState('')
	const [otp, setOtp] = useState('')
	const [backupCodes, setBackupCodes] = useState<string[]>([])
	const [ack, setAck] = useState(false)

	useEffect(() => {
		if (!open) {
			return
		}
		setStep(0)
		setBusy(false)
		setError('')
		setQrUri('')
		setSecretPlain('')
		setOtp('')
		setBackupCodes([])
		setAck(false)
	}, [open])

	if (!open) {
		return null
	}

	const begin = async () => {
		setBusy(true)
		setError('')
		try {
			const data = await api.setup2FA()
			setQrUri(data.qrUri)
			setSecretPlain(data.secret)
			setError('')
			setStep(1)
		} catch (e) {
			setError((e as Error).message || 'error')
		} finally {
			setBusy(false)
		}
	}

	const verify = async (ev: FormEvent) => {
		ev.preventDefault()
		setBusy(true)
		setError('')
		try {
			const { backupCodes: codes } = await api.verify2FASetup(otp.trim())
			setBackupCodes(codes)
			setStep(2)
		} catch (e) {
			setError((e as Error).message || 'error')
		} finally {
			setBusy(false)
		}
	}

	const downloadTxt = () => {
		const body = `${backupCodes.join('\n')}\n`
		const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'mieru-panel-2fa-backup-codes.txt'
		a.click()
		URL.revokeObjectURL(url)
	}

	const copyAll = async () => {
		await navigator.clipboard.writeText(backupCodes.join('\n'))
	}

	const finish = () => {
		onFinished()
		onClose()
	}

	return (
		<div className="modal-backdrop" role="presentation" onMouseDown={() => onClose()}>
			<div
				className="modal totp-setup-modal"
				role="dialog"
				aria-modal
				aria-labelledby="totp-setup-title"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="modal-head">
					<h3 className="modal-title" id="totp-setup-title">
						{t('auth.2fa.setup_intro_title')}
					</h3>
					<button type="button" className="modal-close-btn" onClick={() => onClose()} aria-label={t('auth.2fa.setup_cancel')}>
						×
					</button>
				</div>
				<div className="modal-form totp-setup-body">
					{step === 0 ? (
						<>
							<p className="totp-setup-intro">{t('auth.2fa.setup_intro_body')}</p>
							{error ? <p className="field-error">{error}</p> : null}
							<div className="modal-actions">
								<Button type="button" variant="ghost" onClick={() => onClose()} disabled={busy}>
									{t('auth.2fa.setup_cancel')}
								</Button>
								<Button type="button" variant="primary" onClick={() => void begin()} disabled={busy}>
									{busy ? t('app_loading') : t('auth.2fa.setup_begin')}
								</Button>
							</div>
						</>
					) : null}

					{step === 1 ? (
						<form onSubmit={(e) => void verify(e)}>
							<p className="totp-setup-scan-title">{t('auth.2fa.setup_scan_title')}</p>
							<div className="totp-qr-wrap">
								{qrUri ? <QRCodeSVG value={qrUri} size={180} level="M" /> : null}
							</div>
							<div className="field">
								<label>{t('auth.2fa.setup_manual_secret')}</label>
								<code className="totp-secret-box">{secretPlain}</code>
							</div>
							<div className="field">
								<label htmlFor="totp-verify-code">{t('auth.2fa.setup_verify_code')}</label>
								<input
									id="totp-verify-code"
									type="text"
									inputMode="numeric"
									autoComplete="one-time-code"
									maxLength={6}
									value={otp}
									disabled={busy}
									onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
								/>
							</div>
							{error ? <p className="field-error">{error}</p> : null}
							<div className="modal-actions">
								<Button type="button" variant="ghost" onClick={() => onClose()} disabled={busy}>
									{t('auth.2fa.setup_cancel')}
								</Button>
								<Button type="submit" variant="primary" disabled={busy || otp.length !== 6}>
									{busy ? t('app_loading') : t('auth.2fa.setup_submit')}
								</Button>
							</div>
						</form>
					) : null}

					{step === 2 ? (
						<>
							<p className="totp-setup-scan-title">{t('auth.2fa.setup_backups_title')}</p>
							<p className="totp-setup-backups-hint">{t('auth.2fa.setup_backups_hint')}</p>
							<ul className="totp-backup-list">
								{backupCodes.map((c) => (
									<li key={c}>
										<code>{c}</code>
									</li>
								))}
							</ul>
							<div className="modal-actions totp-backup-actions">
								<Button type="button" variant="secondary" onClick={() => void copyAll()}>
									{t('auth.2fa.setup_copy_all')}
								</Button>
								<Button type="button" variant="secondary" onClick={() => downloadTxt()}>
									{t('auth.2fa.setup_download_txt')}
								</Button>
								<Button type="button" variant="primary" onClick={() => setStep(3)}>
									{t('auth.2fa.setup_next')}
								</Button>
							</div>
						</>
					) : null}

					{step === 3 ? (
						<>
							<label className="totp-ack">
								<input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
								<span>{t('auth.2fa.setup_ack_label')}</span>
							</label>
							<div className="modal-actions">
								<Button type="button" variant="ghost" onClick={() => onClose()} disabled={busy}>
									{t('auth.2fa.setup_cancel')}
								</Button>
								<Button type="button" variant="primary" disabled={!ack} onClick={() => finish()}>
									{t('auth.2fa.setup_finish')}
								</Button>
							</div>
						</>
					) : null}
				</div>
			</div>
		</div>
	)
}
