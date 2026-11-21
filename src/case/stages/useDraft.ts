import { useEffect, useRef, useState } from 'react'

/**
 * Local draft of a server text field. Saves after 800 ms of inactivity and on blur;
 * re-syncs when the server value changes and the user is not typing.
 */
export function useDraft(serverValue: string, save: (v: string) => void) {
  const [draft, setDraft] = useState(serverValue)
  const dirty = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  useEffect(() => {
    if (!dirty.current) setDraft(serverValue)
  }, [serverValue])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const flush = (v = draft) => {
    window.clearTimeout(timer.current)
    if (dirty.current) {
      dirty.current = false
      if (v !== serverValue) saveRef.current(v)
    }
  }

  const change = (v: string) => {
    dirty.current = true
    setDraft(v)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => flush(v), 800)
  }

  return { value: draft, change, flush: () => flush() }
}
