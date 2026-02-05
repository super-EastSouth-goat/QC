'use client'

import { useState, useCallback } from 'react'
import { ProfileService } from '@/lib/services/profileService'
import { Profile, UserRole } from '@/lib/types'

export function useProfileManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const profileService = new ProfileService()

  const createProfile = useCallback(async (userId: string, role: UserRole = 'worker', station?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const profile = await profileService.createProfile(userId, role, station)
      return profile
    } catch (err) {
      setError('创建用户配置失败')
      return null
    } finally {
      setLoading(false)
    }
  }, [profileService])

  const updateProfile = useCallback(async (userId: string, updates: Partial<Pick<Profile, 'role' | 'station'>>) => {
    setLoading(true)
    setError(null)
    
    try {
      const profile = await profileService.updateProfile(userId, updates)
      return profile
    } catch (err) {
      setError('更新用户配置失败')
      return null
    } finally {
      setLoading(false)
    }
  }, [profileService])

  const deleteProfile = useCallback(async (userId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const success = await profileService.deleteProfile(userId)
      if (!success) {
        setError('删除用户配置失败')
      }
      return success
    } catch (err) {
      setError('删除用户配置失败')
      return false
    } finally {
      setLoading(false)
    }
  }, [profileService])

  const getAllProfiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const profiles = await profileService.getAllProfiles()
      return profiles
    } catch (err) {
      setError('获取用户列表失败')
      return []
    } finally {
      setLoading(false)
    }
  }, [profileService])

  const getProfilesByRole = useCallback(async (role: UserRole) => {
    setLoading(true)
    setError(null)
    
    try {
      const profiles = await profileService.getProfilesByRole(role)
      return profiles
    } catch (err) {
      setError('获取用户列表失败')
      return []
    } finally {
      setLoading(false)
    }
  }, [profileService])

  const getProfilesByStation = useCallback(async (station: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const profiles = await profileService.getProfilesByStation(station)
      return profiles
    } catch (err) {
      setError('获取用户列表失败')
      return []
    } finally {
      setLoading(false)
    }
  }, [profileService])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    getAllProfiles,
    getProfilesByRole,
    getProfilesByStation,
    clearError,
  }
}