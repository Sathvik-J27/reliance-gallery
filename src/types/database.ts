export type UserRole = 'admin' | 'staff'
export type FileType = 'image' | 'video'
export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface Event {
  id: string
  name: string
  description: string | null
  event_date: string
  cover_image_url: string | null
  created_by: string | null
  created_at: string
}

export interface Media {
  id: string
  event_id: string
  uploader_id: string | null
  storage_path: string
  thumbnail_path: string | null
  file_type: FileType | null
  mime_type: string | null
  file_size_bytes: number | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  original_filename: string | null
  created_at: string
  processing_status: ProcessingStatus
  processing_error: string | null
  processing_attempts: number
}

export interface Favorite {
  user_id: string
  media_id: string
  created_at: string
}

export interface Settings {
  id: 1
  visitor_access_code_hash: string
  updated_at: string
  updated_by: string | null
}
