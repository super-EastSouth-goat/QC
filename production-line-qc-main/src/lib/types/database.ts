export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'worker' | 'supervisor' | 'engineer' | 'admin'
          station: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'worker' | 'supervisor' | 'engineer' | 'admin'
          station?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'worker' | 'supervisor' | 'engineer' | 'admin'
          station?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          barcode: string
          station: string | null
          status: 'created' | 'uploading' | 'processing' | 'completed' | 'failed' | 'timeout'
          result: 'PASS' | 'FAIL' | null
          confidence: number | null
          detail: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          barcode: string
          station?: string | null
          status?: 'created' | 'uploading' | 'processing' | 'completed' | 'failed' | 'timeout'
          result?: 'PASS' | 'FAIL' | null
          confidence?: number | null
          detail?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          barcode?: string
          station?: string | null
          status?: 'created' | 'uploading' | 'processing' | 'completed' | 'failed' | 'timeout'
          result?: 'PASS' | 'FAIL' | null
          confidence?: number | null
          detail?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          job_id: string
          user_id: string
          storage_path: string
          file_size: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          user_id: string
          storage_path: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          user_id?: string
          storage_path?: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
      }
      job_events: {
        Row: {
          id: string
          job_id: string
          event: string
          detail: any | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          event: string
          detail?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          event?: string
          detail?: any | null
          created_at?: string
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