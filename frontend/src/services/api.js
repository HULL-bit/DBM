import axios from 'axios'

const api = axios.create({
  // En prod, on pointe par défaut vers le backend Render.
  // On peut surcharger avec VITE_API_BASE_URL si besoin.
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://dbm-8ym4.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Pour FormData (ex: photo de profil), ne pas fixer Content-Type pour que axios envoie multipart/form-data avec boundary
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(
            (import.meta.env.VITE_API_BASE_URL || 'https://dbm-8ym4.onrender.com/api') + '/auth/token/refresh/',
            { refresh },
          )
          localStorage.setItem('access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (_e) {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
