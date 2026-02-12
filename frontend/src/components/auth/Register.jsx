import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, MenuItem, Link } from '@mui/material'
import logo from '/logo.png'
import { useAuth } from '../../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
    telephone: '',
    adresse: '',
    role: 'membre',
    sexe: '',
    profession: '',
    categorie: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const ROLES = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'membre', label: 'Membre' },
    { value: 'jewrine_conservatoire', label: 'Jewrine Conservatoire' },
    { value: 'jewrine_finance', label: 'Jewrine Finance' },
    { value: 'jewrine_culturelle', label: 'Jewrine Culturelle' },
    { value: 'jewrine_sociale', label: 'Jewrine Sociale' },
    { value: 'jewrine_communication', label: 'Jewrine Communication' },
    { value: 'jewrine_organisation', label: 'Jewrine Organisation' },
  ]

  const SEXES = [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errors = {}
    if (!form.username) errors.username = "Nom d'utilisateur requis."
    if (!form.email) errors.email = 'Email requis.'
    if (!form.password) errors.password = 'Mot de passe requis.'
    if (form.password && form.password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
    if (!form.password_confirmation) errors.password_confirmation = 'Confirmation requise.'
    if (form.password && form.password_confirmation && form.password !== form.password_confirmation) {
      errors.password_confirmation = 'Les deux mots de passe ne correspondent pas.'
    }
    if (!form.sexe) errors.sexe = 'Sexe requis.'
    if (!form.categorie) errors.categorie = 'Catégorie requise.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Veuillez corriger les champs en rouge.')
      return
    }
    setLoading(true)
    try {
      const { password_confirmation, ...payload } = form
      await register(payload)
      navigate('/login')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            apiFieldErrors[key] = String(value[0])
          } else if (typeof value === 'string') {
            apiFieldErrors[key] = value
          }
        })
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }))
        setError('Veuillez corriger les champs en rouge.')
      } else {
        const msg = data ? (typeof data === 'object' ? JSON.stringify(data) : data) : "Erreur d'inscription"
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="bg-auth bg-pattern" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card
        className="glass-card"
        sx={{
          maxWidth: 500,
          width: '100%',
          borderLeft: '4px solid #C9A961',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(92, 64, 51, 0.12)',
          transition: 'transform 0.35s ease, box-shadow 0.35s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 56px rgba(92, 64, 51, 0.15)',
          },
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: 72 }} />
            <Typography variant="h5" className="title-script" sx={{ mt: 1 }}>
              Inscription
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              name="username"
              label="Nom d'utilisateur"
              value={form.username}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.username}
              helperText={fieldErrors.username || ''}
            />
            <TextField
              fullWidth
              name="email"
              type="email"
              label="Email"
              value={form.email}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email || ''}
            />
            <TextField
              fullWidth
              name="password"
              type="password"
              label="Mot de passe"
              value={form.password}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password || 'Minimum 8 caractères'}
            />
            <TextField
              fullWidth
              name="password_confirmation"
              type="password"
              label="Confirmation du mot de passe"
              value={form.password_confirmation}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.password_confirmation}
              helperText={fieldErrors.password_confirmation || ''}
            />
            <TextField fullWidth name="first_name" label="Prénom" value={form.first_name} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField fullWidth name="last_name" label="Nom" value={form.last_name} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField fullWidth name="telephone" label="Téléphone" value={form.telephone} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField fullWidth name="adresse" label="Adresse" value={form.adresse} onChange={handleChange} margin="dense" multiline sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField
              fullWidth
              name="sexe"
              select
              label="Sexe"
              value={form.sexe}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.sexe}
              helperText={fieldErrors.sexe || ''}
            >
              {SEXES.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              name="profession"
              label="Profession"
              value={form.profession}
              onChange={handleChange}
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              name="categorie"
              select
              label="Catégorie"
              value={form.categorie}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.categorie}
              helperText={fieldErrors.categorie || 'Élève, Étudiant ou Professionnel'}
            >
              <MenuItem value="">— Aucune —</MenuItem>
              <MenuItem value="eleve">Élève</MenuItem>
              <MenuItem value="etudiant">Étudiant</MenuItem>
              <MenuItem value="professionnel">Professionnel</MenuItem>
            </TextField>
            <TextField fullWidth name="role" select label="Rôle" value={form.role} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 2,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2D5F3F 0%, #3A7750 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1e4029 0%, #2D5F3F 100%)', transform: 'translateY(-1px)' },
              }}
              disabled={loading}
            >
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>
          </form>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center', mt: 2 }}>
            Déjà inscrit ? <Link component={RouterLink} to="/login" underline="hover" sx={{ color: '#2D5F3F', fontWeight: 600 }}>Se connecter</Link>
          </Typography>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center', mt: 1 }}>
            <Link component={RouterLink} to="/accueil" underline="hover" sx={{ color: '#2D5F3F' }}>← Retour à l'accueil</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
