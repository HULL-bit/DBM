import { Component } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { signalerErreur } from '../../services/signalement'

// Sans ceci, une erreur dans n'importe quelle page laissait un écran blanc, sans que
// personne ne soit prévenu. On affiche un message et l'erreur est signalée à l'admin.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erreur: null }
  }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidCatch(erreur, info) {
    signalerErreur({
      message: erreur?.message || String(erreur),
      stack: `${erreur?.stack || ''}\n\nComposants :${info?.componentStack || ''}`,
      niveau: 'critique',
    })
  }

  render() {
    if (!this.state.erreur) return this.props.children
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#2D5F3F', fontWeight: 600 }}>Une erreur est survenue</Typography>
        <Typography color="text.secondary">
          Le problème a été signalé automatiquement à l'administrateur. Vous pouvez recharger la page.
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ bgcolor: '#2D5F3F', '&:hover': { bgcolor: '#1e4029' } }}>
          Recharger
        </Button>
      </Box>
    )
  }
}
