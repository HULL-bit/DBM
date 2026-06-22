import React, { useState, useEffect } from 'react'
import { Box, Grid, Card, CardContent, Typography, CircularProgress, Chip } from '@mui/material'
import { LibraryBooks, Folder, Groups, Event, EventAvailable, PhotoLibrary, EmojiEvents } from '@mui/icons-material'
import api from '../../services/api'
import DocumentsPage from './DocumentsPage'
import RepertoirePage from './RepertoirePage'
import KourelsPage from './KourelsPage'
import SeancesPage from './SeancesPage'
import PresencesPage from './PresencesPage'
import GaleriePage from './GaleriePage'
import EvenementsOrganisation from '../organisation/EvenementsOrganisation'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const MODULES = [
  { key: 'documents', Icon: LibraryBooks, title: 'Documents', desc: 'Bibliothèque numérique, livres, articles, thèses', countKey: 'documents' },
  { key: 'repertoire', Icon: Folder, title: 'Répertoire', desc: 'Archives sonores et enregistrements historiques', countKey: 'repertoire' },
  { key: 'kourels', Icon: Groups, title: 'Kourels', desc: 'Groupes de chant, membres et organisation circulaire', countKey: 'kourels' },
  { key: 'seances', Icon: Event, title: 'Séances', desc: 'Répétitions et prestations avec khassidas', countKey: 'seances' },
  { key: 'presences', Icon: EventAvailable, title: 'Présences', desc: 'Suivi des présences, statistiques et export', countKey: null },
  { key: 'galerie', Icon: PhotoLibrary, title: 'Galerie', desc: 'Albums photos et événements', countKey: 'galerie' },
  { key: 'evenements_org', Icon: EmojiEvents, title: 'Organisation des Événements', desc: 'Magal, Gamou, Ziarra — journées et kourels invités', countKey: null },
]

export default function Conservatoire() {
  const [page, setPage] = useState(null)
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/conservatoire/documents/').catch(() => ({ data: [] })),
      api.get('/conservatoire/archives/').catch(() => ({ data: [] })),
      api.get('/conservatoire/kourels/').catch(() => ({ data: [] })),
      api.get('/conservatoire/seances/').catch(() => ({ data: [] })),
      api.get('/conservatoire/albums/').catch(() => ({ data: [] })),
    ]).then(([docs, arch, kou, sea, alb]) => {
      const len = (r) => (r.data?.results || r.data || []).length
      setCounts({ documents: len(docs), repertoire: len(arch), kourels: len(kou), seances: len(sea), galerie: len(alb) })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const back = () => setPage(null)
  if (page === 'documents') return <DocumentsPage onBack={back} />
  if (page === 'repertoire') return <RepertoirePage onBack={back} />
  if (page === 'kourels') return <KourelsPage onBack={back} />
  if (page === 'seances') return <SeancesPage onBack={back} />
  if (page === 'presences') return <PresencesPage onBack={back} />
  if (page === 'galerie') return <GaleriePage onBack={back} />
  if (page === 'evenements_org') return <EvenementsOrganisation onBack={back} />

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: C.vert, fontWeight: 700, mb: 0.5 }}>Conservatoire</Typography>
        <Typography variant="body2" color="text.secondary">
          Bibliothèque numérique · Répertoire musical · Gestion des kourels et séances
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: C.vert }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {MODULES.map(({ key, Icon, title, desc, countKey }) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <Card
                onClick={() => setPage(key)}
                sx={{
                  cursor: 'pointer', borderRadius: 3, height: '100%',
                  border: '2px solid transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    border: `2px solid ${C.or}`,
                    transform: 'translateY(-6px)',
                    boxShadow: '0 12px 32px rgba(45,95,63,0.15)',
                  },
                }}
              >
                <Box sx={{ height: 5, background: `linear-gradient(90deg, ${C.vert}, ${C.or})` }} />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{
                      width: 54, height: 54, borderRadius: 2.5,
                      bgcolor: `${C.vert}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon sx={{ fontSize: 30, color: C.vert }} />
                    </Box>
                    {countKey && counts[countKey] !== undefined && (
                      <Chip
                        label={counts[countKey]}
                        size="small"
                        sx={{ bgcolor: `${C.or}30`, color: C.vertFonce, fontWeight: 700, fontSize: '0.85rem' }}
                      />
                    )}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: C.vert, mb: 0.5 }}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary">{desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
