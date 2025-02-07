import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useProfile = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Create profile if it doesn't exist
      if (!profile) {
        const { data, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: user.id, target_calories: null }])
          .select()
          .single()

        if (insertError) throw insertError
        profile = data
      }

      setProfile(profile)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return data
    } catch (error) {
      console.error('Error:', error)
      return null
    }
  }

  return {
    profile,
    loading,
    updateProfile
  }
} 