import { Badge } from '@/components/badge'
import { Divider } from '@/components/divider'

export function Stat({ 
  title, 
  value, 
  change, 
  color 
}: { 
  title: string; 
  value: string; 
  change: string;
  color?: 'red' | 'green' | 'lime' | 'pink'
}) {
  // Determine badge color
  let badgeColor = color
  if (!badgeColor) {
    if (change.startsWith('+')) {
      badgeColor = 'lime'
    } else if (change.startsWith('⚠️')) {
      badgeColor = 'red'
    } else if (change.startsWith('✓')) {
      badgeColor = 'green'
    } else {
      badgeColor = 'pink'
    }
  }

  // Determine context text
  let contextText = "from last week"
  if (title.includes('MAP') || title.includes('Revenue at Risk')) {
    contextText = "current status"
  }

  return (
    <div>
      <Divider />
      <div className="mt-6 text-lg/6 font-medium sm:text-sm/6">{title}</div>
      <div className="mt-3 text-3xl/8 font-semibold sm:text-2xl/8">{value}</div>
      <div className="mt-3 text-sm/6 sm:text-xs/6">
        <Badge color={badgeColor}>{change}</Badge>{' '}
        <span className="text-zinc-500">{contextText}</span>
      </div>
    </div>
  )
}
