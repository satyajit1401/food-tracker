import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useProfile = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  console.log('useProfile hook initialized')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session:', session)

      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        console.log('Profile data:', data, 'Error:', error)

        if (error) throw error
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in useProfile:', error)
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