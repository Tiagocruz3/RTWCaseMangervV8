import { create } from 'zustand'
import { Case, CaseStatus, Communication } from '../types'
import { supabaseService } from '../services/supabaseService'

interface CaseState {
  cases: Case[]
  filteredCases: Case[]
  activeCase: Case | null
  isLoading: boolean
  error: string | null
  filterStatus: CaseStatus | 'all'
  searchQuery: string
  
  // Actions
  fetchCases: () => Promise<void>
  getCase: (id: string) => Promise<Case | undefined>
  setActiveCase: (id: string) => void
  clearActiveCase: () => void
  filterCases: (status: CaseStatus | 'all') => void
  searchCases: (query: string) => void
  createCase: (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Case>
  updateCase: (id: string, caseData: Partial<Case>) => Promise<Case | undefined>
  addCommunication: (caseId: string, communication: Omit<Communication, 'id'>) => Promise<Case | undefined>
  addNote: (caseId: string, content: string) => Promise<Case | undefined>
  uploadDocument: (caseId: string, file: File, category?: string) => Promise<void>
  subscribeToCase: (caseId: string) => () => void
  clearError: () => void
}

const applyFilters = (cases: Case[], status: CaseStatus | 'all', query: string) => {
  let filtered = [...cases]
  
  if (status !== 'all') {
    filtered = filtered.filter(c => c.status === status)
  }
  
  if (query) {
    const q = query.toLowerCase()
    filtered = filtered.filter(c => 
      c.worker.firstName.toLowerCase().includes(q) ||
      c.worker.lastName.toLowerCase().includes(q) ||
      c.employer.name.toLowerCase().includes(q) ||
      c.claimNumber.toLowerCase().includes(q)
    )
  }
  
  return filtered
}

const updateCaseInState = (cases: Case[], updatedCase: Case) =>
  cases.map(c => c.id === updatedCase.id ? updatedCase : c)

export const useCaseStore = create<CaseState>((set, get) => ({
  cases: [],
  filteredCases: [],
  activeCase: null,
  isLoading: false,
  error: null,
  filterStatus: 'all',
  searchQuery: '',
  
  fetchCases: async () => {
    const state = get()
    if (state.isLoading) return
    
    set({ isLoading: true, error: null })
    
    try {
      const cases = await supabaseService.getCases()
      set({ 
        cases,
        filteredCases: applyFilters(cases, state.filterStatus, state.searchQuery),
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching cases:', error)
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cases'
      })
    }
  },
  
  getCase: async (id: string) => {
    try {
      return await supabaseService.getCase(id) || undefined
    } catch (error) {
      console.error('Error fetching case:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch case' })
      return undefined
    }
  },
  
  setActiveCase: (id: string) => {
    const { cases } = get()
    const foundCase = cases.find(c => c.id === id)
    set({ activeCase: foundCase || null })
  },
  
  clearActiveCase: () => set({ activeCase: null }),
  
  filterCases: (status: CaseStatus | 'all') => {
    const { cases, searchQuery } = get()
    set({ 
      filteredCases: applyFilters(cases, status, searchQuery),
      filterStatus: status 
    })
  },
  
  searchCases: (query: string) => {
    const { cases, filterStatus } = get()
    set({ 
      filteredCases: applyFilters(cases, filterStatus, query),
      searchQuery: query 
    })
  },
  
  createCase: async (caseData) => {
    set({ isLoading: true, error: null })
    
    try {
      const newCase = await supabaseService.createCase(caseData)
      const { filterStatus, searchQuery } = get()
      
      set(state => ({
        cases: [newCase, ...state.cases],
        filteredCases: applyFilters([newCase, ...state.cases], filterStatus, searchQuery),
        isLoading: false,
        error: null
      }))
      
      return newCase
    } catch (error) {
      console.error('Error creating case:', error)
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create case'
      })
      throw error
    }
  },
  
  updateCase: async (id, caseData) => {
    try {
      const updatedCase = await supabaseService.updateCase(id, caseData)
      const { filterStatus, searchQuery } = get()
      
      set(state => {
        const updatedCases = updateCaseInState(state.cases, updatedCase)
        return {
          cases: updatedCases,
          filteredCases: applyFilters(updatedCases, filterStatus, searchQuery),
          activeCase: state.activeCase?.id === id ? updatedCase : state.activeCase,
          error: null
        }
      })
      
      return updatedCase
    } catch (error) {
      console.error('Error updating case:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update case' })
      throw error
    }
  },
  
  addCommunication: async (caseId, communication) => {
    try {
      await supabaseService.addCommunication(caseId, communication)
      const updatedCase = await supabaseService.getCase(caseId)
      
      if (updatedCase) {
        const { filterStatus, searchQuery } = get()
        
        set(state => {
          const updatedCases = updateCaseInState(state.cases, updatedCase)
          return {
            cases: updatedCases,
            filteredCases: applyFilters(updatedCases, filterStatus, searchQuery),
            activeCase: state.activeCase?.id === caseId ? updatedCase : state.activeCase,
            error: null
          }
        })
        
        return updatedCase
      }
    } catch (error) {
      console.error('Error adding communication:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to add communication' })
      throw error
    }
  },
  
  addNote: async (caseId: string, content: string) => {
    try {
      const { user } = useAuthStore.getState()
      if (!user) throw new Error('User not authenticated')
      
      await supabaseService.addCaseNote(caseId, content, user.name)
      const updatedCase = await supabaseService.getCase(caseId)
      
      if (updatedCase) {
        const { filterStatus, searchQuery } = get()
        
        set(state => {
          const updatedCases = updateCaseInState(state.cases, updatedCase)
          return {
            cases: updatedCases,
            filteredCases: applyFilters(updatedCases, filterStatus, searchQuery),
            activeCase: state.activeCase?.id === caseId ? updatedCase : state.activeCase,
            error: null
          }
        })
        
        return updatedCase
      }
    } catch (error) {
      console.error('Error adding note:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to add note' })
      throw error
    }
  },

  uploadDocument: async (caseId: string, file: File, category?: string) => {
    try {
      await supabaseService.uploadDocument(file, caseId, category)
      const updatedCase = await supabaseService.getCase(caseId)
      
      if (updatedCase) {
        const { filterStatus, searchQuery } = get()
        
        set(state => {
          const updatedCases = updateCaseInState(state.cases, updatedCase)
          return {
            cases: updatedCases,
            filteredCases: applyFilters(updatedCases, filterStatus, searchQuery),
            activeCase: state.activeCase?.id === caseId ? updatedCase : state.activeCase,
            error: null
          }
        })
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to upload document' })
      throw error
    }
  },

  subscribeToCase: (caseId: string) => {
    const subscription = supabaseService.subscribeToCase(caseId, () => {
      get().getCase(caseId).then(updatedCase => {
        if (updatedCase) {
          const { filterStatus, searchQuery } = get()
          
          set(state => {
            const updatedCases = updateCaseInState(state.cases, updatedCase)
            return {
              cases: updatedCases,
              filteredCases: applyFilters(updatedCases, filterStatus, searchQuery),
              activeCase: state.activeCase?.id === caseId ? updatedCase : state.activeCase
            }
          })
        }
      })
    })

    return () => subscription.unsubscribe()
  },

  clearError: () => set({ error: null })
}))

// Import useAuthStore to avoid circular dependency
import { useAuthStore } from './authStore'