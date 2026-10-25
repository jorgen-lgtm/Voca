export type InstrumentType = 'drums' | 'bass' | 'piano' | 'guitar' | 'synth' | 'strings' | 'brass' | 'organ' | 'voice' | 'memo'

export interface MidiNote {
  pitch: number
  velocity: number
  startTime: number
  duration: number
}

export interface MidiData {
  notes: MidiNote[]
  duration: number
  volume?: number
}

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
      users: {
        Row: {
          id: string
          email: string
          pro_status: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          pro_status?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          pro_status?: boolean
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          tempo: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          tempo?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          tempo?: number
          created_at?: string
        }
      }
      tracks: {
        Row: {
          id: string
          project_id: string
          instrument_type: InstrumentType
          midi_data: MidiData
          is_muted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          instrument_type: InstrumentType
          midi_data: MidiData
          is_muted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          instrument_type?: InstrumentType
          midi_data?: MidiData
          is_muted?: boolean
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
      instrument_type: InstrumentType
    }
  }
}
