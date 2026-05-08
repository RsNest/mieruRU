'use client'

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SectionCard } from '@/components/ui/SectionCard'
import { api } from '@/lib/api'
import { useDirty } from '@/hooks/useDirty'
import { useToast } from './useToast'
import { TotpStatus } from './admin/TotpStatus'

const userNamePattern = /^[a-zA-Z0-9_-]{2,32}$/

export function AdminCredentialsPanel() {
	const { t } = useTranslation()
	const { success, error } = useToast()
	const [currentPassword, setCurrentPassword] = useState('')
	const [newUsername, setNewUsername] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const isDirty = useDirty(
		{ currentPassword: '', newUsername: '', newPassword: '' },
		{ currentPassword, newUsername, newPassword },
	)

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault()
		const trimmedUsername = newUsername.trim()
		if (!userNamePattern.test(trimmedUsername)) {
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
				newUsername: trimmedUsername,
				newPassword,
			})
			success(t('toast_admin_credentials_saved'))
			setCurrentPassword('')
			setNewUsername('')
			setNewPassword('')
		} catch (err) {
			error((err as Error).message || t('toast_error'))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="admin-credentials-stack">
			<SectionCard title={t('admin_settings_title')} description={t('admin_settings_hint')} isDirty={isDirty}>
				<form className="admin-credentials-form" onSubmit={(ev) => void onSubmit(ev)} aria-busy={submitting}>
					<Field label={t('admin_settings_current_password')} htmlFor="admin-current-pass">
						<input
							id="admin-current-pass"
							type="password"
							autoComplete="current-password"
							value={currentPassword}
							onChange={(ev) => setCurrentPassword(ev.target.value)}
							disabled={submitting}
						/>
					</Field>
					<Field label={t('admin_settings_new_username')} htmlFor="admin-new-user">
						<input
							id="admin-new-user"
							type="text"
							autoComplete="username"
							value={newUsername}
							onChange={(ev) => setNewUsername(ev.target.value)}
							disabled={submitting}
						/>
					</Field>
					<Field label={t('admin_settings_new_password')} htmlFor="admin-new-pass">
						<input
							id="admin-new-pass"
							type="password"
							autoComplete="new-password"
							value={newPassword}
							onChange={(ev) => setNewPassword(ev.target.value)}
							disabled={submitting}
						/>
					</Field>
					<Button type="submit" variant="primary" disabled={submitting}>
						{submitting ? t('saving') : t('admin_settings_submit')}
					</Button>
				</form>
			</SectionCard>

			<SectionCard title={t('auth.2fa.section_title')} description={t('auth.2fa.section_hint')}>
				<TotpStatus />
			</SectionCard>
		</div>
	)
}
