import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Link, IconButton, InputAdornment, useMediaQuery, useTheme, Stepper, Step, StepLabel } from '@mui/material'
import logo from '/logo.png'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import api from '../../services/api'

export default function ForgotPassword() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [step, setStep] = useState(0) // 0 = demande du code, 1 = saisie du code + nouveau mot de passe
  const [identifiant, setIdentifiant] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleRequestCode = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/password/forgot/', { identifiant })
      setInfo(data.detail || "Si un compte correspond, un code vient d'être envoyé par WhatsApp.")
      setStep(1)
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi du code.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/password/reset/', {
        identifiant,
        code: code.trim(),
        new_password: newPassword,
      })
      setInfo(data.detail || 'Mot de passe réinitialisé avec succès.')
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Code invalide ou expiré.')
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
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 } }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: { xs: 68, sm: 88 }, mb: 1.5 }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} className="title-script" sx={{ mb: 0.5 }}>
              Mot de passe oublié
            </Typography>
            <Typography variant="body1" className="subtitle-elegant" sx={{ color: '#5C4033', fontSize: '1rem' }}>
              Réinitialisation par code email
            </Typography>
          </Box>

          <Stepper activeStep={step} sx={{ mb: 3 }}>
            <Step><StepLabel>Identifiant</StepLabel></Step>
            <Step><StepLabel>Nouveau mot de passe</StepLabel></Step>
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          {info && !error && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{info}</Alert>}

          {done ? (
            <Button
              component={RouterLink}
              to="/login"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 1, py: 1.5, borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #2D5F3F 0%, #3A7750 100%)' }}
            >
              Aller à la connexion
            </Button>
          ) : step === 0 ? (
            <form onSubmit={handleRequestCode}>
              <Typography variant="body2" sx={{ mb: 2, color: '#1A1A1A' }}>
                Entrez votre nom d'utilisateur ou votre adresse email. Un code à 6 chiffres vous sera envoyé
                par email s'il correspond à un compte.
              </Typography>
              <TextField
                fullWidth
                label="Nom d'utilisateur ou email"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                margin="normal"
                required
                autoFocus
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !identifiant}
                sx={{ mt: 3, mb: 1, py: 1.5, borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #2D5F3F 0%, #3A7750 100%)' }}
              >
                {loading ? 'Envoi...' : 'Recevoir le code par email'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <TextField
                fullWidth
                label="Code reçu par email"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                margin="normal"
                required
                autoFocus
                inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="new-password"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="new-password"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 1, py: 1.5, borderRadius: 2, fontWeight: 600, background: 'linear-gradient(135deg, #2D5F3F 0%, #3A7750 100%)' }}
              >
                {loading ? 'Validation...' : 'Réinitialiser le mot de passe'}
              </Button>
              <Button fullWidth onClick={() => setStep(0)} sx={{ color: '#5C4033' }}>
                Renvoyer un code
              </Button>
            </form>
          )}

          {!done && (
            <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center', mt: 2 }}>
              <Link component={RouterLink} to="/login" underline="hover" sx={{ color: '#2D5F3F', fontWeight: 600 }}>
                ← Retour à la connexion
              </Link>
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
