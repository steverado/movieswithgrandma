import { useEffect, useState } from 'react'

const MESSAGES = [
  'CONSULTING GRANDMA\'S COMFORT LEVEL...',
  'FAST-FORWARDING THROUGH THE SUSPICIOUS PARTS...',
  'CHECKING IF YOU\'LL NEED TO LEAVE THE ROOM...',
  'ASKING GRANDMA WHAT SHE CAN HANDLE...',
  'REVIEWING THE FOOTAGE...',
]

export default function LoadingState() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length)
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="loading-state" role="status" aria-live="polite">
      {MESSAGES[index]}
    </div>
  )
}
