import { useEffect, useState } from 'react'

interface LiveClockProps {
  showSeconds?: boolean
  showDate?: boolean
  hour12?: boolean
  className?: string
  dateClassName?: string
}

export default function LiveClock({
  showSeconds = false,
  showDate = false,
  hour12 = true,
  className = '',
  dateClassName = '',
}: LiveClockProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalMs = showSeconds ? 1000 : 30000
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [showSeconds])

  const timeText = now.toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12,
  })

  if (!showDate) {
    return <span className={className}>{timeText}</span>
  }

  const dateText = now.toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <span className="inline-flex items-center gap-2">
      <span className={dateClassName}>{dateText}</span>
      <span className={className}>{timeText}</span>
    </span>
  )
}
