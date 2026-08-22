import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  CircularProgress,
  Autocomplete,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import { Security } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const ROLES = [
  { value: 'membre', label: 'Membre' },
  { value: 'jewrin', label: 'Jewrin (général)' },
  { value: 'jewrine_conservatoire', label: 'Jewrin Conservatoire' },
  { value: 'jewrine_culturelle', label: 'Jewrin Culturelle' },
  { value: 'jewrine_finance', label: 'Jewrin Finance' },
  { value: 'jewrine_sociale', label: 'Jewrin Sociale' },
  { value: 'jewrine_communication', label: 'Jewrin Communication' },
  { value: 'jewrine_organisation', label: 'Jewrin Organisation' },
  { value: 'jewrine_scientifique', label: 'Jewrin Scientifique' },
]

const ACTIONS = [
  { field: 'peut_voir', label: 'Voir' },
  { field: 'peut_creer', label: 'Créer' },
  { field: 'peut_modifier', label: 'Modifier' },
  { field: 'peut_supprimer', label: 'Supprimer' },
  { field: 'peut_valider', label: 'Valider' },
]

export default function GestionRolesPermissions() {
  const [tab, setTab] = useState('roles')
  const [message, setMessage] = useState({ type: '', text: '' })

  // --- Onglet "Par rôle" ---
  const [matrice, setMatrice] = useState([])
  const [loadingMatrice, setLoadingMatrice] = useState(true)
  const [roleActif, setRoleActif] = useState('membre')
  const [savingId, setSavingId] = useState(null)

  const loadMatrice = () => {
    setLoadingMatrice(true)
    api.get('/auth/rbac/matrice/').then(({ data }) => setMatrice(data)).catch(() => setMatrice([])).finally(() => setLoadingMatrice(false))
  }
  useEffect(() => { loadMatrice() }, [])

  const lignesRoleActif = useMemo(
    () => matrice.filter((l) => l.role === roleActif).sort((a, b) => a.rubrique.localeCompare(b.rubrique)),
    [matrice, roleActif]
  )

  const handleToggleMatrice = async (ligne, champ) => {
    const nouvelleValeur = !ligne[champ]
    setSavingId(ligne.id)
    setMatrice((prev) => prev.map((l) => (l.id === ligne.id ? { ...l, [champ]: nouvelleValeur } : l)))
    try {
      await api.patch('/auth/rbac/matrice/', { lignes: [{ id: ligne.id, [champ]: nouvelleValeur }] })
      setMessage({ type: 'success', text: 'Permission mise à jour.' })
    } catch (err) {
      setMatrice((prev) => prev.map((l) => (l.id === ligne.id ? { ...l, [champ]: !nouvelleValeur } : l)))
      setMessage({ type: 'error', text: "Erreur lors de la mise à jour." })
    } finally {
      setSavingId(null)
    }
  }

  // --- Onglet "Exceptions par membre" ---
  const [membres, setMembres] = useState([])
  const [membreSelectionne, setMembreSelectionne] = useState(null)
  const [overrides, setOverrides] = useState([])
  const [loadingOverrides, setLoadingOverrides] = useState(false)

  useEffect(() => {
    api.get('/auth/users/').then(({ data }) => setMembres(data.results || data)).catch(() => setMembres([]))
  }, [])

  const loadOverrides = (membreId) => {
    setLoadingOverrides(true)
    api.get('/auth/rbac/overrides/', { params: { membre: membreId } })
      .then(({ data }) => setOverrides(data))
      .catch(() => setOverrides([]))
      .finally(() => setLoadingOverrides(false))
  }

  useEffect(() => {
    if (membreSelectionne) loadOverrides(membreSelectionne.id)
    else setOverrides([])
  }, [membreSelectionne])

  const handleChangeOverride = async (ligne, champsValeurs) => {
    if (!membreSelectionne) return
    setOverrides((prev) => prev.map((o) => (o.rubrique === ligne.rubrique ? { ...o, ...champsValeurs } : o)))
    try {
      const payload = { user: membreSelectionne.id, rubrique: ligne.rubrique, ...champsValeurs }
      await api.post('/auth/rbac/overrides/', payload)
      setMessage({ type: 'success', text: 'Exception mise à jour.' })
      loadOverrides(membreSelectionne.id)
    } catch (err) {
      setMessage({ type: 'error', text: "Erreur lors de la mise à jour de l'exception." })
      loadOverrides(membreSelectionne.id)
    }
  }

  const triState = (val) => (val === true ? 'oui' : val === false ? 'non' : 'herite')
  const fromTriState = (val) => (val === 'oui' ? true : val === 'non' ? false : null)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Security sx={{ color: COLORS.vert, fontSize: 32 }} />
        <Box>
          <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }}>Rôles &amp; Permissions</Typography>
          <Typography variant="body2" color="text.secondary">
            Qui voit quoi, qui peut créer/modifier/valider quoi — par rôle, avec des exceptions possibles par membre.
          </Typography>
        </Box>
      </Box>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ my: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: `1px solid ${COLORS.or}30`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${COLORS.vert} !important` },
          '& .MuiTabs-indicator': { bgcolor: COLORS.vert },
        }}
      >
        <Tab label="Permissions par rôle" value="roles" />
        <Tab label="Exceptions par membre" value="membres" />
      </Tabs>

      {tab === 'roles' && (
        <Box>
          <TextField
            select
            size="small"
            label="Rôle"
            value={roleActif}
            onChange={(e) => setRoleActif(e.target.value)}
            sx={{ minWidth: 260, mb: 2 }}
          >
            {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>

          {loadingMatrice ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${COLORS.or}30` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: COLORS.vertFonce, bgcolor: `${COLORS.vert}08` } }}>
                    <TableCell>Rubrique</TableCell>
                    {ACTIONS.map((a) => <TableCell key={a.field} align="center">{a.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lignesRoleActif.map((ligne) => (
                    <TableRow key={ligne.id} hover>
                      <TableCell sx={{ fontWeight: 600, color: COLORS.vert }}>{ligne.rubrique_display}</TableCell>
                      {ACTIONS.map((a) => (
                        <TableCell key={a.field} align="center">
                          <Checkbox
                            size="small"
                            checked={!!ligne[a.field]}
                            disabled={savingId === ligne.id}
                            onChange={() => handleToggleMatrice(ligne, a.field)}
                            sx={{ color: COLORS.vert, '&.Mui-checked': { color: COLORS.vert } }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {tab === 'membres' && (
        <Box>
          <Autocomplete
            options={membres}
            getOptionLabel={(m) => `${m.first_name || ''} ${m.last_name || ''} (${m.username})`.trim()}
            value={membreSelectionne}
            onChange={(e, val) => setMembreSelectionne(val)}
            renderInput={(params) => <TextField {...params} label="Rechercher un membre" size="small" />}
            sx={{ maxWidth: 400, mb: 2 }}
          />

          {!membreSelectionne ? (
            <Typography color="text.secondary">Sélectionnez un membre pour voir/modifier ses exceptions.</Typography>
          ) : loadingOverrides ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${COLORS.or}30` }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: COLORS.vertFonce, bgcolor: `${COLORS.vert}08` } }}>
                    <TableCell>Rubrique</TableCell>
                    <TableCell align="center">Visibilité</TableCell>
                    <TableCell align="center">Droits de gestion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overrides.map((ligne) => (
                    <TableRow key={ligne.rubrique} hover>
                      <TableCell sx={{ fontWeight: 600, color: COLORS.vert }}>{ligne.rubrique_display}</TableCell>
                      <TableCell align="center">
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={triState(ligne.peut_voir)}
                          onChange={(e, val) => val && handleChangeOverride(ligne, { peut_voir: fromTriState(val) })}
                        >
                          <ToggleButton value="herite">Hérité</ToggleButton>
                          <ToggleButton value="oui" sx={{ '&.Mui-selected': { bgcolor: '#2E7D3220', color: '#2E7D32' } }}>Visible</ToggleButton>
                          <ToggleButton value="non" sx={{ '&.Mui-selected': { bgcolor: '#C6282820', color: '#C62828' } }}>Masqué</ToggleButton>
                        </ToggleButtonGroup>
                      </TableCell>
                      <TableCell align="center">
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={triState(ligne.peut_modifier)}
                          onChange={(e, val) => {
                            if (!val) return
                            const v = fromTriState(val)
                            handleChangeOverride(ligne, { peut_creer: v, peut_modifier: v, peut_valider: v })
                          }}
                        >
                          <ToggleButton value="herite">Hérité</ToggleButton>
                          <ToggleButton value="oui" sx={{ '&.Mui-selected': { bgcolor: '#2E7D3220', color: '#2E7D32' } }}>Autorisé</ToggleButton>
                          <ToggleButton value="non" sx={{ '&.Mui-selected': { bgcolor: '#C6282820', color: '#C62828' } }}>Refusé</ToggleButton>
                        </ToggleButtonGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  )
}
