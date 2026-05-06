import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useToast } from './useToast'

const userNamePattern = /^[a-zA-Z0-9_-]{2,32}$/

export function AdminCredentialsPanel() {
	const { t } = useTranslation()
	const { success, error } = useToast()
	const [currentPassword, setCurrentPassword] = useState('')
	const [newUsername, setNewUsername] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (!userNamePattern.test(newUsername.trim())) {
			error(t('admin_username_error'))
			return
		}
		if (newPassword.length < 5) {
			error(t('admin_password_too_short'))
			return
		}
		setSubmitting(true)
		try {
			await api.updateAdminCredentials({
				currentPassword,
				newUsername: newUsername.trim(),
				newPassword,
			})
			success(t('toast_admin_credentials_saved'))
			setCurrentPassword('')
			setNewUsername('')
			setNewPassword('')
		} catch {
			error(t('toast_error'))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="dashboard-card admin-credentials-card">
			<h3 className="modal-title">{t('admin_settings_title')}</h3>
			<p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
				{t('admin_settings_hint')}
			</p>
			<form className="admin-credentials-form" onSubmit={(ev) => void onSubmit(ev)}>
				<div className="field">
					<label htmlFor="admin-current-pass">{t('admin_settings_current_password')}</label>
					<input
						id="admin-current-pass"
						type="password"
						autoComplete="current-password"
						value={currentPassword}
						onChange={(ev) => setCurrentPassword(ev.target.value)}
					/>
				</div>
				<div className="field">
					<label htmlFor="admin-new-user">{t('admin_settings_new_username')}</label>
					<input
						id="admin-new-user"
						type="text"
						autoComplete="username"
						value={newUsername}
						onChange={(ev) => setNewUsername(ev.target.value)}
					/>
				</div>
				<div className="field">
					<label htmlFor="admin-new-pass">{t('admin_settings_new_password')}</label>
					<input
						id="admin-new-pass"
						type="password"
						autoComplete="new-password"
						value={newPassword}
						onChange={(ev) => setNewPassword(ev.target.value)}
					/>
				</div>
				<button type="submit" className="btn-primary" disabled={submitting}>
					{t('admin_settings_submit')}
				</button>
			</form>
		</div>
	)
}
