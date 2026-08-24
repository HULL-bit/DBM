import { useState, Fragment } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Link,
  IconButton,
  InputAdornment,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import logo from '/logo.png'
import { useAuth } from '../../context/AuthContext'
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  Badge,
  Phone,
  LocationOn,
  Wc,
  Work,
  Category,
  Groups,
  Bloodtype,
  MenuBook,
  AutoStories,
  HowToReg,
  Mosque,
  CheckCircle,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material'

const COLORS = { vert: '#2D5F3F', vertFonce: '#1e4029', or: '#C9A961', noir: '#1A1A1A' }

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } }

const gradientBtnSx = {
  py: 1.1,
  px: 3,
  borderRadius: 2,
  fontWeight: 600,
  background: 'linear-gradient(135deg, #2D5F3F 0%, #3A7750 100%)',
  '&:hover': { background: 'linear-gradient(135deg, #1e4029 0%, #2D5F3F 100%)', transform: 'translateY(-1px)' },
  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
}

const SEXES = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
]
const CELLULES = [
  { value: '', label: 'Non renseigné' },
  { value: 'dakar', label: 'Dakar' },
  { value: 'touba_mbacke', label: 'Touba / Mbacké' },
  { value: 'diaspora', label: 'Diaspora' },
]
const GROUPES_SANGUINS = [
  { value: '', label: 'Non renseigné' },
  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
]
const NIVEAUX = [
  { value: '', label: 'Non renseigné' },
  { value: 'faible', label: 'Faible' },
  { value: 'debutant', label: 'Débutant' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
]

const STEPS = [
  { label: 'Compte', icon: <HowToReg fontSize="small" />, subtitle: 'Choisissez vos identifiants de connexion' },
  { label: 'Identité', icon: <Badge fontSize="small" />, subtitle: 'Parlez-nous un peu de vous' },
  { label: 'Profil', icon: <Mosque fontSize="small" />, subtitle: 'Personnalisez votre profil à la Daara' },
]

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [activeStep, setActiveStep] = useState(0)
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
    cellule: '',
    groupe_sanguin: '',
    niveau_alquran: '',
    niveau_majalis: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }))
  }

  const validateStep = (step) => {
    const errors = {}
    if (step === 0) {
      if (!form.username) errors.username = "Nom d'utilisateur requis."
      if (!form.email) errors.email = 'Email requis.'
      if (!form.password) errors.password = 'Mot de passe requis.'
      if (form.password && form.password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
      if (!form.password_confirmation) errors.password_confirmation = 'Confirmation requise.'
      if (form.password && form.password_confirmation && form.password !== form.password_confirmation) {
        errors.password_confirmation = 'Les deux mots de passe ne correspondent pas.'
      }
    } else if (step === 1) {
      if (!form.sexe) errors.sexe = 'Sexe requis.'
    } else if (step === 2) {
      if (!form.categorie) errors.categorie = 'Catégorie requise.'
    }
    return errors
  }

  const handleNext = () => {
    const errors = validateStep(activeStep)
    if (Object.keys(errors).length > 0) {
      setFieldErrors((fe) => ({ ...fe, ...errors }))
      setError('Veuillez corriger les champs en rouge.')
      return
    }
    setError('')
    setActiveStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  const handleBack = () => {
    setError('')
    setActiveStep((s) => Math.max(0, s - 1))
  }

  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter' && activeStep < STEPS.length - 1) {
      e.preventDefault()
      handleNext()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errors = { ...validateStep(0), ...validateStep(1), ...validateStep(2) }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Veuillez corriger les champs en rouge.')
      return
    }
    setLoading(true)
    try {
      const { password_confirmation, role, ...payload } = form
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

  const isLastStep = activeStep === STEPS.length - 1

  return (
    <Box className="bg-auth bg-pattern" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1.5, sm: 2 } }}>
      <Card
        className="glass-card"
        sx={{
          maxWidth: 640,
          width: '100%',
          borderLeft: '4px solid #C9A961',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(92, 64, 51, 0.12)',
          animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: { xs: 56, sm: 68 } }} />
            <Typography variant={isMobile ? 'h6' : 'h5'} className="title-script" sx={{ mt: 1 }}>
              Rejoignez la Daara
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.vertFonce, maxWidth: 440, mx: 'auto', mt: 0.5 }}>
              Créez votre compte membre pour suivre vos cotisations, votre progression au Kamil,
              les événements et échanger avec la communauté.
            </Typography>
          </Box>

          {/* Indicateur d'étapes */}
          <Box sx={{ mt: 3, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              {STEPS.map((s, idx) => (
                <Fragment key={s.label}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 84 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        bgcolor: idx < activeStep ? COLORS.vert : '#fff',
                        border: `2px solid ${idx <= activeStep ? COLORS.vert : '#ddd'}`,
                        color: idx < activeStep ? '#fff' : idx === activeStep ? COLORS.vert : '#bbb',
                        boxShadow: idx === activeStep ? `0 0 0 5px ${COLORS.vert}1f` : 'none',
                        transform: idx === activeStep ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {idx < activeStep ? <CheckCircle fontSize="small" /> : s.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.5,
                        fontWeight: idx === activeStep ? 700 : 500,
                        color: idx <= activeStep ? COLORS.vert : '#999',
                        display: { xs: idx === activeStep ? 'block' : 'none', sm: 'block' },
                        textAlign: 'center',
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {s.label}
                    </Typography>
                  </Box>
                  {idx < STEPS.length - 1 && (
                    <Box
                      sx={{
                        flex: 1,
                        height: 3,
                        mt: '18px',
                        borderRadius: 2,
                        bgcolor: idx < activeStep ? COLORS.vert : '#e0e0e0',
                        transition: 'background-color 0.4s ease',
                      }}
                    />
                  )}
                </Fragment>
              ))}
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2, mb: 1, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate>
            <Typography
              variant="subtitle2"
              sx={{ color: COLORS.vert, fontWeight: 700, mt: 2.5, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
              {STEPS[activeStep].icon} {STEPS[activeStep].subtitle}
            </Typography>

            <Box key={activeStep} sx={{ animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              {activeStep === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="username"
                      label="Nom d'utilisateur"
                      value={form.username}
                      onChange={handleChange}
                      required
                      sx={fieldSx}
                      error={!!fieldErrors.username}
                      helperText={fieldErrors.username || ''}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="email"
                      type="email"
                      label="Email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      sx={fieldSx}
                      error={!!fieldErrors.email}
                      helperText={fieldErrors.email || ''}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      label="Mot de passe"
                      value={form.password}
                      onChange={handleChange}
                      required
                      sx={fieldSx}
                      error={!!fieldErrors.password}
                      helperText={fieldErrors.password || 'Min. 8 caractères'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Lock fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="password_confirmation"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      label="Confirmation"
                      value={form.password_confirmation}
                      onChange={handleChange}
                      required
                      sx={fieldSx}
                      error={!!fieldErrors.password_confirmation}
                      helperText={fieldErrors.password_confirmation || ''}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Lock fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPasswordConfirm((s) => !s)} edge="end" aria-label={showPasswordConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                              {showPasswordConfirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              )}

              {activeStep === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="first_name"
                      label="Prénom"
                      value={form.first_name}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="last_name"
                      label="Nom"
                      value={form.last_name}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="sexe"
                      select
                      label="Sexe"
                      value={form.sexe}
                      onChange={handleChange}
                      required
                      sx={fieldSx}
                      error={!!fieldErrors.sexe}
                      helperText={fieldErrors.sexe || ''}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Wc fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    >
                      {SEXES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="telephone"
                      label="Téléphone"
                      value={form.telephone}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="adresse"
                      label="Adresse"
                      value={form.adresse}
                      onChange={handleChange}
                      multiline
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    />
                  </Grid>
                </Grid>
              )}

              {activeStep === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="profession"
                      label="Profession"
                      value={form.profession}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Work fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="categorie"
                      select
                      label="Catégorie"
                      value={form.categorie}
                      onChange={handleChange}
                      required
                      sx={fieldSx}
                      error={!!fieldErrors.categorie}
                      helperText={fieldErrors.categorie || 'Élève, Étudiant ou Professionnel'}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Category fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    >
                      <MenuItem value="">— Aucune —</MenuItem>
                      <MenuItem value="eleve">Élève</MenuItem>
                      <MenuItem value="etudiant">Étudiant</MenuItem>
                      <MenuItem value="professionnel">Professionnel</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="cellule"
                      select
                      label="Cellule"
                      value={form.cellule}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Groups fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    >
                      {CELLULES.map((c) => <MenuItem key={c.value || 'none'} value={c.value}>{c.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="groupe_sanguin"
                      select
                      label="Groupe sanguin"
                      value={form.groupe_sanguin}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Bloodtype fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    >
                      {GROUPES_SANGUINS.map((g) => <MenuItem key={g.value || 'none'} value={g.value}>{g.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="niveau_alquran"
                      select
                      label="Niveau Al-Quran"
                      value={form.niveau_alquran}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><MenuBook fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    >
                      {NIVEAUX.map((n) => <MenuItem key={n.value || 'none'} value={n.value}>{n.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="niveau_majalis"
                      select
                      label="Niveau Majalis"
                      value={form.niveau_majalis}
                      onChange={handleChange}
                      sx={fieldSx}
                      InputProps={{ startAdornment: <InputAdornment position="start"><AutoStories fontSize="small" sx={{ color: COLORS.or }} /></InputAdornment> }}
                    >
                      {NIVEAUX.map((n) => <MenuItem key={n.value || 'none'} value={n.value}>{n.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                </Grid>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3.5, gap: 2 }}>
              <Button
                type="button"
                onClick={handleBack}
                startIcon={<ArrowBack />}
                sx={{ color: COLORS.vertFonce, visibility: activeStep === 0 ? 'hidden' : 'visible' }}
              >
                Retour
              </Button>
              {!isLastStep ? (
                <Button type="button" variant="contained" onClick={handleNext} endIcon={<ArrowForward />} sx={gradientBtnSx}>
                  Suivant
                </Button>
              ) : (
                <Button type="submit" variant="contained" disabled={loading} sx={{ ...gradientBtnSx, minWidth: 160 }}>
                  {loading ? 'Inscription...' : "S'inscrire"}
                </Button>
              )}
            </Box>
          </form>

          <Typography variant="body2" sx={{ color: COLORS.noir, textAlign: 'center', mt: 3 }}>
            Déjà inscrit ? <Link component={RouterLink} to="/login" underline="hover" sx={{ color: COLORS.vert, fontWeight: 600 }}>Se connecter</Link>
          </Typography>
          <Typography variant="body2" sx={{ color: COLORS.noir, textAlign: 'center', mt: 1 }}>
            <Link component={RouterLink} to="/accueil" underline="hover" sx={{ color: COLORS.vert }}>← Retour à l'accueil</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
