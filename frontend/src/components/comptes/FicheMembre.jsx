import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Paper, Grid, Avatar, Chip, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Tabs, Tab,
} from '@mui/material'
import { ArrowBack, Edit } from '@mui/icons-material'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const CELLULES = { dakar: 'Dakar', touba_mbacke: 'Touba / Mbacké', diaspora: 'Diaspora' }
const NIVEAUX = { faible: 'Faible', debutant: 'Débutant', moyen: 'Moyen', intermediaire: 'Intermédiaire', avance: 'Avancé' }

function SectionCard({ title, children }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${C.or}30`, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: C.vert, mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  )
}

export default function FicheMembre() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [membre, setMembre] = useState(null)
  const [cotisations, setCotisations] = useState([])
  const [transactions, setTransactions] = useState([])
  const [jukkis, setJukkis] = useState([])
  const [versements, setVersements] = useState([])
  const [presences, setPresences] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('finance')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/auth/users/${id}/`).then(({ data }) => setMembre(data)).catch(() => setMembre(null)),
      api.get('/finance/cotisations/', { params: { membre: id } }).then(({ data }) => setCotisations(data.results || data)).catch(() => setCotisations([])),
      api.get('/finance/transactions/', { params: { membre: id } }).then(({ data }) => setTransactions(data.results || data)).catch(() => setTransactions([])),
      api.get('/culturelle/jukkis/', { params: { membre: id } }).then(({ data }) => setJukkis(data.results || data)).catch(() => setJukkis([])),
      api.get('/culturelle/versements-kamil/', { params: { membre: id } }).then(({ data }) => setVersements(data.results || data)).catch(() => setVersements([])),
      api.get('/conservatoire/presences/', { params: { membre: id } }).then(({ data }) => setPresences(data.results || data)).catch(() => setPresences([])),
    ]).finally(() => setLoading(false))
  }, [id])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: C.vert }} /></Box>
  if (!membre) return <Typography color="text.secondary">Membre introuvable.</Typography>

  const totalCotisations = cotisations.length
  const cotisationsPayees = cotisations.filter(c => c.statut === 'payee').length
  const montantPaye = cotisations.filter(c => c.statut === 'payee').reduce((s, c) => s + Number(c.montant || 0), 0)
  const montantTotal = cotisations.reduce((s, c) => s + Number(c.montant || 0), 0)

  const jukkisValides = jukkis.filter(j => j.est_valide).length
  const montantVerseKamil = versements.filter(v => v.statut === 'valide').reduce((s, v) => s + Number(v.montant || 0), 0)

  const nbPresent = presences.filter(p => p.statut === 'present').length
  const nbAbsent = presences.length - nbPresent

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/membres')} sx={{ bgcolor: `${C.vert}12` }}>
          <ArrowBack sx={{ color: C.vert }} />
        </IconButton>
        <Typography variant="h5" sx={{ color: C.vert, fontWeight: 700 }}>Dossier du membre</Typography>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${C.or}30`, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          <Avatar
            src={getMediaUrl(membre.photo, membre.photo_updated_at ? `v=${membre.photo_updated_at}` : '')}
            sx={{ width: 100, height: 100, fontSize: '2rem', bgcolor: C.vert }}
          >
            {membre.first_name?.[0]}{membre.last_name?.[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: C.vertFonce }}>
              {membre.sexe === 'M' ? 'Señ ' : membre.sexe === 'F' ? 'Soxna ' : ''}{membre.first_name} {membre.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">{membre.email} · {membre.telephone || 'Pas de téléphone'}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip label={membre.role_display || membre.role} size="small" sx={{ bgcolor: `${C.or}25`, color: C.vertFonce, fontWeight: 600 }} />
              <Chip label={membre.est_actif ? 'Actif' : 'Inactif'} size="small" color={membre.est_actif ? 'success' : 'default'} />
              {membre.cellule && <Chip label={CELLULES[membre.cellule] || membre.cellule} size="small" />}
              {membre.groupe_sanguin && <Chip label={`GS ${membre.groupe_sanguin}`} size="small" />}
            </Box>
          </Box>
          <Grid container spacing={2} sx={{ maxWidth: 360 }}>
            {[
              ['Profession', membre.profession],
              ['Catégorie', membre.categorie],
              ['Niveau Al-Quran', NIVEAUX[membre.niveau_alquran]],
              ['Niveau Majalis', NIVEAUX[membre.niveau_majalis]],
              ['N° carte', membre.numero_carte],
              ['Inscrit le', membre.date_inscription ? new Date(membre.date_inscription).toLocaleDateString('fr-FR') : ''],
            ].filter(([, v]) => v).map(([label, value]) => (
              <Grid item xs={6} key={label}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          mb: 2, borderBottom: `1px solid ${C.or}30`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${C.vert} !important` },
          '& .MuiTabs-indicator': { bgcolor: C.vert },
        }}
      >
        <Tab label="Finance" value="finance" />
        <Tab label="Culturelle (Kamil)" value="culturelle" />
        <Tab label="Conservatoire" value="conservatoire" />
      </Tabs>

      {tab === 'finance' && (
        <>
          <SectionCard title="Résumé des cotisations">
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Cotisations</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vert }}>{cotisationsPayees}/{totalCotisations}</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Montant payé</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{montantPaye.toLocaleString('fr-FR')} FCFA</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Montant total assigné</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vertFonce }}>{montantTotal.toLocaleString('fr-FR')} FCFA</Typography></Grid>
              <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Reste</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{(montantTotal - montantPaye).toLocaleString('fr-FR')} FCFA</Typography></Grid>
            </Grid>
          </SectionCard>
          <SectionCard title="Historique des cotisations">
            {cotisations.length === 0 ? <Typography color="text.secondary">Aucune cotisation.</Typography> : (
              <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>Type</TableCell><TableCell>Période</TableCell><TableCell align="right">Montant</TableCell><TableCell>Statut</TableCell></TableRow></TableHead>
                <TableBody>
                  {cotisations.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.type_cotisation === 'assignation' ? (c.objet_assignation || 'Assignation') : 'Mensualité'}</TableCell>
                      <TableCell>{c.mois}/{c.annee}</TableCell>
                      <TableCell align="right">{Number(c.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><Chip size="small" label={c.statut_display || c.statut} color={c.statut === 'payee' ? 'success' : 'default'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></TableContainer>
            )}
          </SectionCard>
          <SectionCard title="Transactions">
            {transactions.length === 0 ? <Typography color="text.secondary">Aucune transaction.</Typography> : (
              <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>Type</TableCell><TableCell align="right">Montant</TableCell><TableCell>Statut</TableCell><TableCell>Date</TableCell></TableRow></TableHead>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.type_display || t.type_transaction}</TableCell>
                      <TableCell align="right">{Number(t.montant).toLocaleString('fr-FR')} FCFA</TableCell>
                      <TableCell><Chip size="small" label={t.statut_display || t.statut} color={t.statut === 'validee' ? 'success' : 'default'} /></TableCell>
                      <TableCell>{new Date(t.date_transaction).toLocaleDateString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></TableContainer>
            )}
          </SectionCard>
        </>
      )}

      {tab === 'culturelle' && (
        <>
          <SectionCard title="Programme Kamil">
            <Grid container spacing={2} sx={{ mb: jukkis.length ? 2 : 0 }}>
              <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">JUKKI assignés</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vert }}>{jukkis.length}</Typography></Grid>
              <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">JUKKI validés</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{jukkisValides}</Typography></Grid>
              <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Versé (Kamil)</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: C.vertFonce }}>{montantVerseKamil.toLocaleString('fr-FR')} FCFA</Typography></Grid>
            </Grid>
            {jukkis.length === 0 ? <Typography color="text.secondary">Aucun JUKKI assigné.</Typography> : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {jukkis.map(j => (
                  <Chip key={j.id} label={`JUKKI ${j.numero}`} size="small" color={j.est_valide ? 'success' : 'default'} variant={j.est_valide ? 'filled' : 'outlined'} />
                ))}
              </Box>
            )}
          </SectionCard>
        </>
      )}

      {tab === 'conservatoire' && (
        <SectionCard title="Présences aux répétitions/prestations">
          {presences.length === 0 ? (
            <Typography color="text.secondary">Ce membre ne fait partie d'aucun kourel, ou n'a aucune présence enregistrée.</Typography>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Présences</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#2E7D32' }}>{nbPresent}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Absences</Typography><Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>{nbAbsent}</Typography></Grid>
              </Grid>
              <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>Séance</TableCell><TableCell>Statut</TableCell></TableRow></TableHead>
                <TableBody>
                  {presences.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.seance_titre || `#${p.seance}`}</TableCell>
                      <TableCell><Chip size="small" label={p.statut_display || p.statut} color={p.statut === 'present' ? 'success' : 'error'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></TableContainer>
            </>
          )}
        </SectionCard>
      )}
    </Box>
  )
}
