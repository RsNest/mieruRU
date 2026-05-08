'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { syncThemeColorMeta } from '@/lib/syncThemeMeta'
import { useAuthStore } from '@/store/auth'
import { useSettingsStore } from '@/store/settings'
import { LoginLockedError } from '@/lib/api'
import { Button } from '@/components/ui/Button'

type LoginStep = 'credentials' | 'totp'

function lockMinutes(seconds: number) {
	return Math.ceil(seconds / 60)
}

export function LoginPage() {
	const { t, i18n } = useTranslation()
	const router = useRouter()
	const loginWithPassword = useAuthStore((s) => s.loginWithPassword)
	const complete2FALogin = useAuthStore((s) => s.complete2FALogin)
	const theme = useSettingsStore((state) => state.theme)
	const lang = useSettingsStore((state) => state.lang)
	const [step, setStep] = useState<LoginStep>('credentials')
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [challengeToken, setChallengeToken] = useState<string | null>(null)
	const [useBackup, setUseBackup] = useState(false)
	const [otpCode, setOtpCode] = useState('')
	const [backupCode, setBackupCode] = useState('')
	const [error, setError] = useState('')
	const [pending, setPending] = useState(false)
	const [shakeSeed, setShakeSeed] = useState(0)
	const totpSubmitBusy = useRef(false)

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
		syncThemeColorMeta(theme)
	}, [theme])

	useEffect(() => {
		if (i18n.language !== lang) void i18n.changeLanguage(lang)
	}, [lang, i18n])

	const bumpShake = () => setShakeSeed((v) => v + 1)

	const resetTotpFlow = () => {
		setStep('credentials')
		setChallengeToken(null)
		setUseBackup(false)
		setOtpCode('')
		setBackupCode('')
		setError('')
		setPending(false)
	}

	const onCredentialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError('')
		const u = username.trim()
		if (!u || !password) {
			return
		}
		setPending(true)
		try {
			const res = await loginWithPassword(u, password)
			if (res.needs2FA) {
				setChallengeToken(res.challengeToken)
				setStep('totp')
				setPassword('')
				return
			}
			router.replace('/')
		} catch (e) {
			setError(t('login_error'))
			bumpShake()
		} finally {
			setPending(false)
		}
	}

	const submitTotp = useCallback(async () => {
		if (totpSubmitBusy.current) {
			return
		}
		const u = username.trim()
		if (!challengeToken || !u) {
			setError(t('login_error'))
			return
		}
		totpSubmitBusy.current = true
		setError('')
		setPending(true)
		try {
			const code = useBackup ? backupCode.trim() : otpCode.trim()
			await complete2FALogin(u, code, challengeToken, useBackup)
			router.replace('/')
		} catch (e) {
			if (e instanceof LoginLockedError) {
				const m = Math.max(lockMinutes(e.retryAfterSeconds), 1)
				setError(t('auth.2fa.locked_minutes', { minutes: m }))
			} else {
				setError(t('auth.2fa.code_invalid'))
				bumpShake()
			}
		} finally {
			setPending(false)
			totpSubmitBusy.current = false
		}
	}, [backupCode, challengeToken, complete2FALogin, otpCode, router, t, username, useBackup])

	const handleOtpChange = (raw: string) => {
		const digits = raw.replace(/\D/g, '').slice(0, 6)
		setOtpCode(digits)
		if (digits.length === 6 && !pending) {
			setTimeout(() => void submitTotp(), 0)
		}
	}

	const normalizeBackup = (raw: string) =>
		raw
			.toUpperCase()
			.replace(/[^0-9A-F-]/g, '')
			.slice(0, 9)

	const handleBackupChange = (raw: string) => {
		let v = normalizeBackup(raw)
		if (v.length > 4 && !v.includes('-')) {
			v = `${v.slice(0, 4)}-${v.slice(4, 8)}`.slice(0, 9)
		}
		setBackupCode(v)
	}

	const onTotpSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		await submitTotp()
	}

	const toggleBackupMode = () => {
		setUseBackup((v) => !v)
		setOtpCode('')
		setBackupCode('')
		setError('')
	}

	return (
		<div className="login-page">
			<div className="login-backdrop" aria-hidden />
			<div className="login-glyph" aria-hidden="true">
				見
			</div>
			{step === 'credentials' ? (
				<motion.form
					className="login-card"
					onSubmit={(e) => void onCredentialsSubmit(e)}
					animate={
						error
							? {
									x: [0, -10, 10, -6, 6, -3, 3, 0],
									transition: { duration: 0.5 },
								}
							: { x: 0 }
					}
					key={shakeSeed}
				>
					<div className="login-logo">
						<span className="login-logo-kanji">見</span>
						<div className="login-logo-title">{t('app_title')}</div>
					</div>
					<div className="field">
						<label htmlFor="username">{t('login_username')}</label>
						<input
							id="username"
							type="text"
							autoComplete="username"
							placeholder={t('login_username')}
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							disabled={pending}
						/>
					</div>
					<div className="field">
						<label htmlFor="password">{t('login_password')}</label>
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							placeholder={t('login_password')}
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							disabled={pending}
						/>
					</div>
					<Button type="submit" variant="cta" size="lg" disabled={pending}>
						{pending ? t('app_loading') : t('login_btn')}
					</Button>
					{error ? <p className="field-error">{error}</p> : null}
				</motion.form>
			) : (
				<motion.form
					className="login-card login-card-totp"
					onSubmit={(e) => void onTotpSubmit(e)}
					animate={
						error
							? {
									x: [0, -10, 10, -6, 6, -3, 3, 0],
									transition: { duration: 0.5 },
								}
							: { x: 0 }
					}
					key={`totp-${shakeSeed}`}
				>
					<div className="login-logo">
						<span className="login-logo-kanji">見</span>
						<div className="login-logo-title">{t('auth.2fa.login_step_title')}</div>
					</div>
					<p className="login-totp-hint">{t('auth.2fa.login_step_hint')}</p>
					{!useBackup ? (
						<div className="field">
							<label htmlFor="login-totp">{t('auth.2fa.setup_verify_code')}</label>
							<input
								id="login-totp"
								className="login-totp-digits"
								type="text"
								inputMode="numeric"
								pattern="\d{6}"
								autoComplete="one-time-code"
								autoFocus
								maxLength={6}
								placeholder={t('auth.2fa.totp_placeholder')}
								value={otpCode}
								disabled={pending}
								onChange={(e) => handleOtpChange(e.target.value)}
							/>
						</div>
					) : (
						<div className="field">
							<label htmlFor="login-backup">{t('auth.2fa.backup_code_label')}</label>
							<input
								id="login-backup"
								className="login-backup-code"
								type="text"
								autoComplete="off"
								autoFocus
								placeholder={t('auth.2fa.backup_placeholder')}
								value={backupCode}
								disabled={pending}
								onChange={(e) => handleBackupChange(e.target.value)}
							/>
						</div>
					)}
					<button
						type="button"
						className="login-totp-mode-link"
						onClick={() => toggleBackupMode()}
						disabled={pending}
					>
						{useBackup ? t('auth.2fa.use_totp_link') : t('auth.2fa.use_backup_link')}
					</button>
					<Button type="submit" variant="cta" size="lg" disabled={pending}>
						{pending ? t('app_loading') : t('login_btn')}
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => resetTotpFlow()}
						disabled={pending}
					>
						{t('auth.2fa.cancel')}
					</Button>
					{error ? <p className="field-error">{error}</p> : null}
				</motion.form>
			)}
		</div>
	)
}
