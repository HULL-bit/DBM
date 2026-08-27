import { useRef, useState, useEffect } from 'react'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import { Download } from '@mui/icons-material'
import QRCode from 'qrcode'
import logo from '/logo.png'
import { capturerAvecPhotos } from '../../utils/exportCarte'
import usePhotoMembre from '../../hooks/usePhotoMembre'

const C = { vert: '#2D5F3F', vertFonce: '#1e4029', or: '#C9A961', noir: '#1A1A1A' }
const CARD_WIDTH = 360

function initials(nom) {
  if (!nom) return '?'
  const parts = nom.trim().split(' ')
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
}

/** Contenu du QR code : format vCard standard, lisible par n'importe quel scanner/téléphone,
 * reprenant toutes les données du membre (identité, contact, matricule, dates). */
function construireVCard(membre, identifiant) {
  const nom = membre.last_name || ''
  const prenom = membre.first_name || ''
  const lignes = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${nom};${prenom};;;`,
    `FN:${prenom} ${nom}`.trim(),
    'ORG:Daara Barakatul Mahaahidi',
    `TITLE:${membre.role_display || membre.role || ''}`,
  ]
  if (membre.telephone) lignes.push(`TEL:${membre.telephone}`)
  if (membre.email) lignes.push(`EMAIL:${membre.email}`)
  if (membre.adresse) lignes.push(`ADR:;;${membre.adresse};;;;`)
  const notes = [
    `Matricule: ${identifiant}`,
    membre.date_naissance && `Né(e) le: ${membre.date_naissance}`,
    membre.date_inscription && `Membre depuis: ${new Date(membre.date_inscription).toLocaleDateString('fr-FR')}`,
    membre.groupe_sanguin && `Groupe sanguin: ${membre.groupe_sanguin}`,
    membre.profession && `Profession: ${membre.profession}`,
  ].filter(Boolean).join(' | ')
  lignes.push(`NOTE:${notes}`)
  lignes.push('END:VCARD')
  return lignes.join('\n')
}

/**
 * Carte de membre au format badge (utilisable pour Mon Profil comme pour la fiche
 * admin d'un membre) — visuelle, recto/verso avec QR code, exportable en PDF (une page
 * par face). Toutes les informations propres à la carte (matricule, date de naissance,
 * date de délivrance) ne sont modifiables que par l'admin (fiche membre) — jamais par le
 * membre lui-même.
 */
export default function CarteMembre({ membre }) {
  const rectoRef = useRef(null)
  const versoRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const photoBlobUrl = usePhotoMembre(membre.id, !!membre.photo)

  const identifiant = membre.numero_carte || `#${String(membre.id).padStart(5, '0')}`
  const dateInscription = membre.date_inscription
    ? new Date(membre.date_inscription).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : ''
  const dateNaissance = membre.date_naissance
    ? new Date(membre.date_naissance).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const dateDelivrance = membre.date_delivrance_carte
    ? new Date(membre.date_delivrance_carte).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  // La carte suit l'année d'adhésion en cours : valable jusqu'au 31 décembre de l'année en cours.
  const anneeExpiration = new Date().getFullYear()

  useEffect(() => {
    let annule = false
    QRCode.toDataURL(construireVCard(membre, identifiant), { width: 200, margin: 1, color: { dark: C.noir, light: '#ffffff' } })
      .then((url) => { if (!annule) setQrDataUrl(url) })
      .catch(() => { if (!annule) setQrDataUrl(null) })
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membre.id, membre.numero_carte, membre.telephone, membre.adresse])

  const handleTelecharger = async () => {
    if (!rectoRef.current || !versoRef.current) return
    setExporting(true)
    try {
      const [{ default: jsPDF }, rectoCanvas, versoCanvas] = await Promise.all([
        import('jspdf'),
        capturerAvecPhotos(rectoRef.current),
        capturerAvecPhotos(versoRef.current),
      ])

      // Format carte bancaire (CR80) en mm, une face par page, pour une impression recto-verso.
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] })
      pdf.addImage(rectoCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54)
      pdf.addPage([85.6, 54], 'landscape')
      pdf.addImage(versoCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54)
      pdf.save(`carte_membre_${membre.username || membre.id}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Recto */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Recto</Typography>
          <Box
            ref={rectoRef}
            sx={{
              width: CARD_WIDTH, maxWidth: '100%', borderRadius: 3, overflow: 'hidden',
              border: `1px solid ${C.or}66`, boxShadow: '0 8px 28px rgba(45,95,63,0.18)',
              fontFamily: '"Poppins", sans-serif', bgcolor: '#fff',
            }}
          >
            <Box sx={{
              background: `linear-gradient(135deg, ${C.vert} 0%, ${C.vertFonce} 100%)`,
              color: '#fff', px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Box component="img" src={logo} alt="Logo" sx={{ height: 32, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.1 }} noWrap>
                  Daara Barakatul Mahaahidi
                </Typography>
                <Typography sx={{ fontSize: '0.65rem', color: C.or, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Carte de membre
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              {photoBlobUrl ? (
                <Box
                  component="img"
                  src={photoBlobUrl}
                  sx={{ width: 84, height: 84, borderRadius: 2, flexShrink: 0, objectFit: 'cover', border: `2px solid ${C.or}` }}
                />
              ) : (
                <Box
                  sx={{
                    width: 84, height: 84, borderRadius: 2, flexShrink: 0,
                    border: `2px solid ${C.or}`, bgcolor: C.vert, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', fontWeight: 700,
                  }}
                >
                  {initials(`${membre.first_name || ''} ${membre.last_name || ''}`)}
                </Box>
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 700, color: C.vertFonce, fontSize: '0.95rem', lineHeight: 1.25 }} noWrap>
                  Nom : {membre.last_name || '—'}
                </Typography>
                <Typography sx={{ fontWeight: 700, color: C.vertFonce, fontSize: '0.95rem', lineHeight: 1.25 }} noWrap>
                  Prénom : {membre.first_name || '—'}
                </Typography>
                <Typography sx={{ color: C.vert, fontWeight: 600, fontSize: '0.78rem', mt: 0.25 }}>
                  {membre.role_display || membre.role}
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.25 }}>
                  Matricule : {identifiant}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.4, borderTop: `1px dashed ${C.or}55`, pt: 1.25, mx: 2 }}>
              {membre.adresse && (
                <Typography sx={{ color: C.noir, fontSize: '0.68rem' }} noWrap>
                  <strong>Adresse :</strong> {membre.adresse}
                </Typography>
              )}
              {dateNaissance && (
                <Typography sx={{ color: C.noir, fontSize: '0.68rem' }}>
                  <strong>Né(e) le :</strong> {dateNaissance}
                </Typography>
              )}
              {dateInscription && (
                <Typography sx={{ color: C.noir, fontSize: '0.68rem' }}>
                  <strong>Date d'adhésion :</strong> {dateInscription}
                </Typography>
              )}
              {dateDelivrance && (
                <Typography sx={{ color: C.noir, fontSize: '0.68rem' }}>
                  <strong>Délivrée le :</strong> {dateDelivrance}
                </Typography>
              )}
              <Typography sx={{ color: C.noir, fontSize: '0.68rem' }}>
                <strong>Valide jusqu'au :</strong> 31 décembre {anneeExpiration}
              </Typography>
            </Box>

            <Box sx={{ height: 5, background: `linear-gradient(90deg, ${C.or}, ${C.vert})`, mt: 1.5 }} />
          </Box>
        </Box>

        {/* Verso */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Verso</Typography>
          <Box
            ref={versoRef}
            sx={{
              width: CARD_WIDTH, maxWidth: '100%', height: 227, borderRadius: 3, overflow: 'hidden',
              border: `1px solid ${C.or}66`, boxShadow: '0 8px 28px rgba(45,95,63,0.18)',
              fontFamily: '"Poppins", sans-serif', bgcolor: '#fff',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <Box sx={{ height: 8, background: `linear-gradient(90deg, ${C.vert}, ${C.or})` }} />
            <Box sx={{ p: 2, display: 'flex', gap: 1.5, flex: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                {membre.profession && (
                  <Typography sx={{ color: C.noir, fontSize: '0.68rem' }} noWrap>
                    <strong>Profession :</strong> {membre.profession}
                  </Typography>
                )}
                {membre.groupe_sanguin && (
                  <Typography sx={{ color: C.noir, fontSize: '0.68rem' }}>
                    <strong>Groupe sanguin :</strong> {membre.groupe_sanguin}
                  </Typography>
                )}
                {membre.telephone && (
                  <Typography sx={{ color: C.noir, fontSize: '0.68rem' }}>
                    <strong>Contact :</strong> {membre.telephone}
                  </Typography>
                )}
                <Typography sx={{ color: 'text.secondary', fontSize: '0.6rem', mt: 0.5 }}>
                  Cette carte est strictement personnelle et ne peut être cédée à un tiers.
                  En cas de perte, merci de la remettre à la Daara Barakatul Mahaahidi.
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Box sx={{ textAlign: 'center', pt: 0.5 }}>
                  <Box sx={{ borderBottom: `1px solid ${C.noir}55`, height: 22 }} />
                  <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', mt: 0.5 }}>Signature du titulaire</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                {qrDataUrl && (
                  <Box component="img" src={qrDataUrl} alt="QR code" sx={{ width: 88, height: 88, border: `1px solid ${C.or}55`, borderRadius: 1 }} />
                )}
                <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', textAlign: 'center', maxWidth: 90 }}>
                  Scannez pour voir les infos du membre
                </Typography>
              </Box>
            </Box>
            <Box sx={{ height: 8, background: `linear-gradient(90deg, ${C.or}, ${C.vert})` }} />
          </Box>
        </Box>
      </Box>

      <Button
        size="small"
        variant="outlined"
        startIcon={exporting ? <CircularProgress size={16} /> : <Download />}
        onClick={handleTelecharger}
        disabled={exporting}
        sx={{ borderColor: C.vert, color: C.vert }}
      >
        Télécharger la carte (PDF recto-verso)
      </Button>
    </Box>
  )
}
