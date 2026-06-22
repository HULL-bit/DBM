import React, { useState } from 'react'
import { Box, Grid, Card, CardContent, Typography } from '@mui/material'
import { Groups, Inventory2 } from '@mui/icons-material'
import Reunions from './Reunions'
import MaterielsPage from './MaterielsPage'

const C = { vert: '#2D5F3F', or: '#C9A961', vertFonce: '#1e4029' }

const MODULES = [
  { key: 'reunions', Icon: Groups, title: 'Réunions & Activités', desc: 'Procès-verbaux, décisions, votes et suivi des réunions' },
  { key: 'materiels', Icon: Inventory2, title: 'Gestion des Matériels', desc: 'Inventaire, disponibilité et suivi des équipements' },
]

export default function Organisation() {
  const [page, setPage] = useState(null)

  const back = () => setPage(null)
  if (page === 'reunions') return <Reunions onBack={back} />
  if (page === 'materiels') return <MaterielsPage onBack={back} />

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: C.vert, fontWeight: 700, fontFamily: '"Cormorant Garamond", serif' }}>
          Organisation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Réunions · Activités · Gestion du matériel
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {MODULES.map(({ key, Icon, title, desc }) => (
          <Grid item xs={12} sm={6} key={key}>
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
                <Box sx={{
                  width: 54, height: 54, borderRadius: 2.5,
                  bgcolor: `${C.vert}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                }}>
                  <Icon sx={{ fontSize: 30, color: C.vert }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: C.vert, mb: 0.5 }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary">{desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
