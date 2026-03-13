import { redirect } from 'next/navigation'

// /settings → redirect to /settings/billing for now
export default function SettingsPage() {
  redirect('/settings/billing')
}
