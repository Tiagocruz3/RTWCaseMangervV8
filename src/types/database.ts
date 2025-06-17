export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: 'consultant' | 'admin' | 'support'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: 'consultant' | 'admin' | 'support'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'consultant' | 'admin' | 'support'
          avatar_url?: string | null
          updated_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          worker_data: Json
          employer_data: Json
          case_manager_id: string
          claim_number: string
          injury_date: string
          injury_description: string
          first_certificate_date: string
          planned_rtw_date: string
          review_dates: string[]
          rtw_plan: Json
          consultant_id: string
          status: 'open' | 'closed' | 'pending'
          claim_type: 'insured' | 'self-insured' | null
          jurisdiction: string | null
          agent: string | null
          wages_salary: Json | null
          piawe_calculation: Json | null
          outcome: Json | null
          created_at: string
          updated_at: string
          workcover_type: string | null
        }
        Insert: {
          id?: string
          worker_data: Json
          employer_data: Json
          case_manager_id: string
          claim_number: string
          injury_date: string
          injury_description: string
          first_certificate_date: string
          planned_rtw_date: string
          review_dates?: string[]
          rtw_plan: Json
          consultant_id: string
          status?: 'open' | 'closed' | 'pending'
          claim_type?: 'insured' | 'self-insured' | null
          jurisdiction?: string | null
          agent?: string | null
          wages_salary?: Json | null
          piawe_calculation?: Json | null
          outcome?: Json | null
          created_at?: string
          updated_at?: string
          workcover_type?: string | null
        }
        Update: {
          worker_data?: Json
          employer_data?: Json
          case_manager_id?: string
          claim_number?: string
          injury_date?: string
          injury_description?: string
          first_certificate_date?: string
          planned_rtw_date?: string
          review_dates?: string[]
          rtw_plan?: Json
          consultant_id?: string
          status?: 'open' | 'closed' | 'pending'
          claim_type?: 'insured' | 'self-insured' | null
          jurisdiction?: string | null
          agent?: string | null
          wages_salary?: Json | null
          piawe_calculation?: Json | null
          outcome?: Json | null
          updated_at?: string
          workcover_type?: string | null
        }
      }
      communications: {
        Row: {
          id: string
          case_id: string
          type: 'email' | 'phone' | 'meeting' | 'other'
          content: string
          author: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          type: 'email' | 'phone' | 'meeting' | 'other'
          content: string
          author: string
          created_at?: string
        }
        Update: {
          type?: 'email' | 'phone' | 'meeting' | 'other'
          content?: string
          author?: string
        }
      }
      documents: {
        Row: {
          id: string
          case_id: string
          name: string
          file_path: string
          file_type: string
          file_size: number
          category: 'medical' | 'legal' | 'correspondence' | 'form' | 'other' | null
          metadata: Json | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          name: string
          file_path: string
          file_type: string
          file_size: number
          category?: 'medical' | 'legal' | 'correspondence' | 'form' | 'other' | null
          metadata?: Json | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          name?: string
          category?: 'medical' | 'legal' | 'correspondence' | 'form' | 'other' | null
          metadata?: Json | null
        }
      }
      case_notes: {
        Row: {
          id: string
          case_id: string
          content: string
          author: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          content: string
          author: string
          created_at?: string
        }
        Update: {
          content?: string
        }
      }
      supervisor_notes: {
        Row: {
          id: string
          case_id: string
          content: string
          author: string
          author_role: 'admin' | 'consultant'
          type: 'instruction' | 'question' | 'reply' | 'general'
          priority: 'low' | 'medium' | 'high'
          status: 'open' | 'acknowledged' | 'resolved'
          parent_id: string | null
          requires_response: boolean
          read_by: string[]
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          content: string
          author: string
          author_role: 'admin' | 'consultant'
          type?: 'instruction' | 'question' | 'reply' | 'general'
          priority?: 'low' | 'medium' | 'high'
          status?: 'open' | 'acknowledged' | 'resolved'
          parent_id?: string | null
          requires_response?: boolean
          read_by?: string[]
          created_at?: string
        }
        Update: {
          content?: string
          type?: 'instruction' | 'question' | 'reply' | 'general'
          priority?: 'low' | 'medium' | 'high'
          status?: 'open' | 'acknowledged' | 'resolved'
          requires_response?: boolean
          read_by?: string[]
        }
      }
      stakeholders: {
        Row: {
          id: string
          case_id: string
          type: string
          name: string
          organization: string | null
          title: string | null
          phone: string
          email: string | null
          address: string | null
          fax: string | null
          specialization: string | null
          notes: string | null
          is_primary: boolean
          is_active: boolean
          last_contact_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          type: string
          name: string
          organization?: string | null
          title?: string | null
          phone: string
          email?: string | null
          address?: string | null
          fax?: string | null
          specialization?: string | null
          notes?: string | null
          is_primary?: boolean
          is_active?: boolean
          last_contact_date?: string | null
          created_at?: string
        }
        Update: {
          type?: string
          name?: string
          organization?: string | null
          title?: string | null
          phone?: string
          email?: string | null
          address?: string | null
          fax?: string | null
          specialization?: string | null
          notes?: string | null
          is_primary?: boolean
          is_active?: boolean
          last_contact_date?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          case_id: string | null
          priority: 'low' | 'medium' | 'high' | 'critical'
          read: boolean
          action_required: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          case_id?: string | null
          priority?: 'low' | 'medium' | 'high' | 'critical'
          read?: boolean
          action_required?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          read?: boolean
          metadata?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}