import type { Metadata } from 'next'
import { AdminChrome } from './admin-chrome'

// Staff console is functional, not content: keep it out of search indexes.
export const metadata: Metadata = {
  title: 'Sanctuary Console',
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminChrome>{children}</AdminChrome>
}
