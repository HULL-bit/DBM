import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Link, IconButton, InputAdornment, useMediaQuery, useTheme } from '@mui/material'
import logo from '/logo.png'
import { useAuth } from '../../context/AuthContext'
import { Visibility, VisibilityOff } from '@mui/icons-material'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showUsername, setShowUsername] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      const isJewrine =
        !!user?.role &&
        (user.role === 'jewrin' ||
          user.role.toLowerCase().startsWith('jewrine_'))
      const dest = user?.role === 'admin' ? '/admin' : isJewrine ? '/jewrin' : '/membre'
      navigate(dest)
    } catch (err) {
      setError(err.response?.data?.detail || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="bg-auth bg-pattern" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1.5, sm: 2 } }}>
      <Card
        className="glass-card"
        sx={{
          maxWidth: 420,
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
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 } }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: { xs: 68, sm: 88 }, mb: 1.5 }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} className="title-script" sx={{ mb: 0.5 }}>
              Daara Barakatul Mahaahidi
            </Typography>
            <Typography variant="body1" className="subtitle-elegant" sx={{ color: '#5C4033', fontSize: '1rem' }}>
              Connexion à la plateforme
            </Typography>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type={showUsername ? 'text' : 'password'}
              label="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin={isMobile ? 'dense' : 'normal'}
              required
              autoComplete="username"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowUsername((s) => !s)}
                      edge="end"
                      aria-label={showUsername ? "Masquer le nom d'utilisateur" : "Afficher le nom d'utilisateur"}
                    >
                      {showUsername ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin={isMobile ? 'dense' : 'normal'}
              required
              autoComplete="current-password"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: { xs: 1.25, sm: 1.5 },
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2D5F3F 0%, #3A7750 100%)',
                boxShadow: '0 4px 14px rgba(45, 95, 63, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1e4029 0%, #2D5F3F 100%)',
                  boxShadow: '0 6px 20px rgba(45, 95, 63, 0.45)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center' }}>
            Pas de compte ?{' '}
            <Link component={RouterLink} to="/register" underline="hover" sx={{ color: '#2D5F3F', fontWeight: 600 }}>
              S'inscrire
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center', mt: 1 }}>
            <Link component={RouterLink} to="/accueil" underline="hover" sx={{ color: '#2D5F3F' }}>
              ← Retour à l'accueil
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
