import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// Back within the app; a screen opened straight from a link (no app history) goes to the map
// instead of leaving the site.
export function useGoBack() {
  const navigate = useNavigate()
  return useCallback(() => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) navigate(-1)
    else navigate('/', { replace: true })
  }, [navigate])
}
