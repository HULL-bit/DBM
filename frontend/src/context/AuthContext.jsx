import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { initPush } from '../services/push'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Permissions RBAC effectives (rôle + exceptions par membre), source unique consultée par
  // toutes les pages — évite les contrôles codés en dur sur le rôle qui ignorent les
  // exceptions accordées par l'admin.
  const [permissions, setPermissions] = useState(null)

  const loadPermissions = () => {
    api.get('/auth/rbac/mes-permissions/').then(({ data }) => setPermissions(data)).catch(() => {})
  }

  useEffect(() => {
    // On stocke désormais les tokens uniquement en sessionStorage
    // pour éviter une reconnexion automatique après fermeture du navigateur.
    const token = sessionStorage.getItem('access')
    if (token) {
      api.get('/auth/me/')
        .then(({ data }) => { setUser(data); initPush(); loadPermissions() })
        .catch(() => {
          sessionStorage.removeItem('access')
          sessionStorage.removeItem('refresh')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const t = setInterval(loadPermissions, 60000)
    return () => clearInterval(t)
  }, [user?.id])

  /** peut('communication', 'creer') → true/false selon les permissions effectives (rôle + exception membre) */
  const peut = (rubrique, action = 'voir') => {
    if (!permissions) return false
    return permissions[rubrique]?.[action] === true
  }

  const login = async (username, password) => {
    const { data } = await api.post('/auth/token/', { username, password })
    sessionStorage.setItem('access', data.access)
    sessionStorage.setItem('refresh', data.refresh)
    setUser(data.user)
    initPush()
    loadPermissions()
    return data.user
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register/', payload)
    return data
  }

  const logout = () => {
    sessionStorage.removeItem('access')
    sessionStorage.removeItem('refresh')
    setUser(null)
    setPermissions(null)
  }

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me/')
    setUser(data)
    return data
  }

  /** Met à jour l'utilisateur dans le contexte (ex. après PATCH profil) pour que Header/Sidebar reflètent tout de suite les changements */
  const setUserFromProfile = (userData) => {
    if (userData) setUser(userData)
  }

  const isAdmin = user?.role === 'admin'
  const isMembre = user?.role === 'membre'
  const isJewrine =
    !!user?.role &&
    (user.role === 'jewrin' ||
      user.role.toLowerCase().startsWith('jewrine_'))

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    setUserFromProfile,
    isAdmin,
    isJewrine,
    isMembre,
    permissions,
    peut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
