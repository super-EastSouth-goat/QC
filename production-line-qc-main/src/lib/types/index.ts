import { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type JobEvent = Database['public']['Tables']['job_events']['Row']

export type JobInsert = Database['public']['Tables']['jobs']['Insert']
export type PhotoInsert = Database['public']['Tables']['photos']['Insert']
export type JobEventInsert = Database['public']['Tables']['job_events']['Insert']

export type JobStatus = 'created' | 'uploading' | 'processing' | 'completed' | 'failed' | 'timeout'
export type QCResult = 'PASS' | 'FAIL'
export type UserRole = 'worker' | 'supervisor' | 'engineer' | 'admin'

export interface EdgeAPIRequest {
  job_id: string
  barcode: string
  image_url: string
}

export interface EdgeAPIResponse {
  status: 'success' | 'error'
  result: 'PASS' | 'FAIL'
  detail?: string
  confidence?: number
}

export interface FilterOptions {
  dateFrom?: string
  dateTo?: string
  status?: QCResult | 'all'
  station?: string
}

export interface QCStats {
  totalUploads: number
  passCount: number
  failCount: number
  date: string
}