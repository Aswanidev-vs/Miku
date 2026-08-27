// Pure activity formatting helpers — shared by ActivityItem and unit-testable
// without mounting any component.

export function formatTime(unix: number): string {
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function statusLabel(status?: string): string {
  if (!status) return ''
  return status.replace(/_/g, ' ').toLowerCase()
}
