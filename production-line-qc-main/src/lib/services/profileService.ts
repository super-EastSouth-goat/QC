import { createClient } from '../supabase/client'
import type { Profile, UserRole } from '../types'

export class ProfileService {
  private supabase = createClient()

  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  async createProfile(userId: string, role: UserRole = 'worker', station?: string): Promise<Profile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          role,
          station,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating profile:', error)
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'role' | 'station'>>): Promise<Profile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      return null
    }
  }

  async getAllProfiles(): Promise<Profile[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all profiles:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching all profiles:', error)
      return []
    }
  }

  async deleteProfile(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Error deleting profile:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting profile:', error)
      return false
    }
  }

  async getProfilesByRole(role: UserRole): Promise<Profile[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching profiles by role:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching profiles by role:', error)
      return []
    }
  }

  async getProfilesByStation(station: string): Promise<Profile[]> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('station', station)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching profiles by station:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching profiles by station:', error)
      return []
    }
  }
}

// 导出单例实例
export const profileService = new ProfileService()