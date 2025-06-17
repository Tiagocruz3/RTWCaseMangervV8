import { useCallback } from 'react'
import { supabaseService } from '../services/supabaseService'
import { useAuthStore } from '../store/authStore'
import { useCaseStore } from '../store/caseStore'

// Centralized hook for common Supabase operations
export const useSupabase = () => {
  const { user } = useAuthStore()
  const { clearError: clearCaseError } = useCaseStore()

  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`${context}:`, error)
    const message = error instanceof Error ? error.message : `Failed to ${context.toLowerCase()}`
    return message
  }, [])

  const safeExecute = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    onError?: (error: string) => void
  ): Promise<T | null> => {
    try {
      clearCaseError()
      return await operation()
    } catch (error) {
      const errorMessage = handleError(error, context)
      onError?.(errorMessage)
      return null
    }
  }, [handleError, clearCaseError])

  return {
    user,
    safeExecute,
    handleError,
    service: supabaseService
  }
}