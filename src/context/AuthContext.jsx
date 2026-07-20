import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signInWithPassword: async () => {},
  signUp: async () => {},
  signInWithMagicLink: async () => {},
  signOut: async () => {}
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nuovaSessione) => {
      setSession(nuovaSessione)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPassword = ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = ({ email, password }) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin }
    })

  const signInWithMagicLink = ({ email }) =>
    supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })

  const signOut = () => supabase.auth.signOut()

  const value = {
    user: session?.user ?? null,
    session,
    loading,
    signInWithPassword,
    signUp,
    signInWithMagicLink,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
