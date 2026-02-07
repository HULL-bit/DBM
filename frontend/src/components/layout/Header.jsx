import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Menu,
  MenuItem,
  Badge,
  Avatar,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  AccountCircle,
  Logout,
  Settings,
} from '@mui/icons-material'
import logo from '/logo.png'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'

// Couleurs logo : vert #2D5F3F, or #C9A961, beige #F4EAD5, noir #1A1A1A
const COLORS = { vert: '#2D5F3F', or: '#C9A961', beige: '#F4EAD5', noir: '#1A1A1A', blanc: '#FFFFFF' }

function getPhotoUrl(photo, photoUpdatedAt) {
  if (!photo) return null
  const query = photoUpdatedAt ? `v=${photoUpdatedAt}` : ''
  return getMediaUrl(photo, query)
}

export default function Header({ onMenuClick, sidebarCollapsed, sidebarWidth = 0, isMobile }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const avatarSrc = user ? getPhotoUrl(user.photo, user.photo_updated_at) : null
  const [anchorUser, setAnchorUser] = useState(null)
  const [anchorNotif, setAnchorNotif] = useState(null)
  const [unreadNotif, setUnreadNotif] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (!user) {
      setUnreadNotif(0)
      setUnreadMessages(0)
      return
    }
    const fetchCounts = async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          api.get('/communication/notifications/'),
          api.get('/communication/messages/'),
        ])
        const notifs = notifRes.data.results || notifRes.data
        const msgs = msgRes.data.results || msgRes.data
        const nNotif = Array.isArray(notifs) ? notifs.filter((n) => !n.est_lue).length : 0
        const nMsg = Array.isArray(msgs)
          ? msgs.filter((m) => m.destinataire === user.id && !m.est_lu).length
          : 0
        setUnreadNotif(nNotif)
        setUnreadMessages(nMsg)
      } catch {
        setUnreadNotif(0)
        setUnreadMessages(0)
      }
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [user])

  const handleUserClose = () => setAnchorUser(null)
  const handleNotifClose = () => setAnchorNotif(null)

  const handleLogout = () => {
    handleUserClose()
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    navigate('/login')
    window.location.reload()
  }

  const marginLeft = !isMobile && sidebarWidth ? sidebarWidth : 0

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: `linear-gradient(90deg, ${COLORS.beige} 0%, ${COLORS.beige} 50%, rgba(244,234,213,0.98) 100%)`,
        borderBottom: `2px solid ${COLORS.or}`,
        boxShadow: `0 4px 20px ${COLORS.vert}12`,
        width: marginLeft ? `calc(100% - ${marginLeft}px)` : '100%',
        marginLeft: marginLeft ? `${marginLeft}px` : 0,
        transition: 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: '1 1 auto' }}>
          <IconButton
            onClick={onMenuClick}
            edge="start"
            sx={{
              color: COLORS.vert,
              transition: 'all 0.25s ease',
              flexShrink: 0,
              '&:hover': { backgroundColor: `${COLORS.or}30`, transform: 'scale(1.05)' },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            component="img"
            src={logo}
            alt="Daara Barakatul Mahaahidi"
            sx={{ height: 42, mr: 1.5, flexShrink: 0, objectFit: 'contain' }}
          />
          <Typography
            variant="body1"
            sx={{
              color: COLORS.vert,
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 600,
              fontSize: { xs: '1.05rem', sm: '1.4rem', md: '1.6rem' },
              display: { xs: 'none', sm: 'block' },
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Daara Barakatul Mahaahidi
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <IconButton
            onClick={() => navigate('/communication/messagerie')}
            sx={{
              color: COLORS.vert,
              transition: 'all 0.25s ease',
              '&:hover': { backgroundColor: `${COLORS.or}25`, color: COLORS.vert },
            }}
          >
            <Badge
              badgeContent={unreadMessages}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem' } }}
            >
              <MessageIcon />
            </Badge>
          </IconButton>
          <IconButton
            onClick={(e) => setAnchorNotif(e.currentTarget)}
            sx={{
              color: COLORS.vert,
              transition: 'all 0.25s ease',
              '&:hover': { backgroundColor: `${COLORS.or}25`, color: COLORS.vert },
            }}
          >
            <Badge
              badgeContent={unreadNotif}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem' } }}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton
            onClick={(e) => setAnchorUser(e.currentTarget)}
            sx={{ color: COLORS.vert, '&:hover': { backgroundColor: `${COLORS.or}25` } }}
          >
            <Avatar
              src={avatarSrc || undefined}
              sx={{ width: 36, height: 36, bgcolor: COLORS.or, color: COLORS.vert }}
            >
              {!avatarSrc && (user?.first_name || user?.last_name) ? `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}` : !avatarSrc ? <AccountCircle /> : null}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorNotif} open={Boolean(anchorNotif)} onClose={handleNotifClose}>
            <MenuItem onClick={() => { handleNotifClose(); navigate('/communication/notifications'); }}>
              Voir toutes les notifications
            </MenuItem>
          </Menu>
          <Menu
            anchorEl={anchorUser}
            open={Boolean(anchorUser)}
            onClose={handleUserClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                borderRadius: 2,
                border: `1px solid ${COLORS.or}`,
                boxShadow: `0 8px 24px ${COLORS.vert}20`,
                background: COLORS.beige,
                '& .MuiMenuItem-root': { color: COLORS.vert },
              },
            }}
          >
            <MenuItem onClick={() => { handleUserClose(); navigate('/comptes/profil'); }}>
              <AccountCircle sx={{ mr: 1, color: COLORS.vert }} /> Mon profil
            </MenuItem>
            <MenuItem onClick={() => { handleUserClose(); navigate('/comptes/profil'); }}>
              <Settings sx={{ mr: 1, color: COLORS.vert }} /> Paramètres
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1, color: COLORS.vert }} /> Déconnexion
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
