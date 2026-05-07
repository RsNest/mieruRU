# i18n Map for UI V2

This map tracks existing keys and upcoming keys needed by the shell migration.

## Existing Key Areas (Already Present)

- App and nav:
  - `app_title`
  - `nav_users`, `nav_server`, `nav_logs`, `nav_logout`
- Server status:
  - `server_running`, `server_idle`, `server_offline`
  - `header_status_aria`
- Generic:
  - `loading`, `saving`, `save`, `saved`
  - `toast_error`
- Users page:
  - search/add/delete/update/regen/bulk keys
  - chart and stats labels
- Server page:
  - server settings, advanced settings, backup, admin credentials
- Logs page:
  - logs filter/pause/resume/clear/mita keys
- Audit page:
  - `audit_title`, `audit_hint`, `audit_empty`

## New Keys Needed for PR 3+ (Planned)

### Sidebar and Topbar

- `sidebar_collapse`
- `sidebar_expand`
- `topbar_breadcrumb_home`
- `topbar_breadcrumb_users`
- `topbar_breadcrumb_server`
- `topbar_breadcrumb_logs`
- `topbar_admin_menu`

### Mobile Drawer

- `mobile_menu_open`
- `mobile_menu_close`

### Status Pill Variants

- `status_running`
- `status_stopped`
- `status_warning`
- `status_unknown`

### Empty-State Templates

- `empty_title_default`
- `empty_desc_default`
- `empty_action_default`

### Logs Toolbar Additions

- `logs_search_placeholder`
- `logs_autoscroll`
- `logs_download`
- `logs_copy_line`
- `logs_load_older`

## Migration Notes

- Keep current keys intact during shell migration.
- Add new keys in all locales (`ru`, `en`, `zh`) in the same PR that introduces corresponding UI.
- Avoid temporary one-locale keys to prevent build/type drift.
