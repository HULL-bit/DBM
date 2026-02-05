import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
} from '@mui/material'
import { ChevronLeft, ChevronRight, Home as HomeIcon } from '@mui/icons-material'
import {
  Dashboard as DashboardIcon,
  Event as EventIcon,
  AccountBalance as FinanceIcon,
  MenuBook as KamilIcon,
  CheckCircle as ValidIcon,
  Mosque as MosqueIcon,
  Message as MessageIcon,
  Notifications as NotifIcon,
  VolunteerActivism as SocialIcon,
  LibraryBooks as ConservatoireIcon,
  School as ScientifiqueIcon,
  Groups as OrgIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logo from '/logo.png'

// Couleurs strictes du logo (pas de noir — tout en vert/or/beige)
const COLORS = {
  vert: '#2D5F3F',
  vertFonce: '#1e4029',
  or: '#C9A961',
  orFonce: '#b89447',
  beige: '#F4EAD5',
  beigeClair: '#faf5eb',
  noir: '#1A1A1A',
  blanc: '#FFFFFF',
}

const SIDEBAR_WIDTH = 280
const SIDEBAR_COLLAPSED = 72

// Menus regroupés par section (admin, membre, jewrin)
const sectionsAdmin = [
  {
    title: 'Navigation',
    items: [
      { label: 'Page d\'accueil', path: '/accueil', icon: <HomeIcon /> },
      { label: 'Tableau de bord', path: '/admin', icon: <DashboardIcon /> },
      { label: 'Gestion membres', path: '/admin/membres', icon: <PeopleIcon /> },
    ],
  },
  { title: 'Informations', items: [{ label: 'Événements', path: '/informations/evenements', icon: <EventIcon /> }] },
  {
    title: 'Finance',
    items: [
      { label: 'Cotisations', path: '/finance/cotisations', icon: <FinanceIcon /> },
      { label: 'Levées de fonds', path: '/finance/levees-fonds', icon: <FinanceIcon /> },
    ],
  },
  {
    title: 'Culturelle',
    items: [
      { label: 'Programme Kamil', path: '/culturelle/kamil', icon: <KamilIcon /> },
      { label: 'Validations Kamil', path: '/culturelle/validations', icon: <ValidIcon /> },
      { label: 'Validations Versements', path: '/culturelle/validations-versements', icon: <PaymentIcon /> },
      { label: 'Activités religieuses', path: '/culturelle/activites-religieuses', icon: <MosqueIcon /> },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Messagerie', path: '/communication/messagerie', icon: <MessageIcon /> },
      { label: 'Notifications', path: '/communication/notifications', icon: <NotifIcon /> },
    ],
  },
  { title: 'Sociale', items: [{ label: 'Sociale', path: '/sociale/projets', icon: <SocialIcon /> }] },
  { title: 'Conservatoire', items: [{ label: 'Conservatoire', path: '/conservatoire', icon: <ConservatoireIcon /> }] },
  { title: 'Scientifique', items: [{ label: 'Cours & Formation', path: '/scientifique/cours', icon: <ScientifiqueIcon /> }] },
  { title: 'Organisation', items: [{ label: 'Matériels & activités', path: '/organisation/reunions', icon: <OrgIcon /> }] },
  { title: 'Comptes', items: [{ label: 'Mon profil', path: '/comptes/profil', icon: <PersonIcon /> }] },
]

const sectionsMembre = [
  {
    title: 'Navigation',
    items: [
      { label: 'Page d\'accueil', path: '/accueil', icon: <HomeIcon /> },
      { label: 'Tableau de bord', path: '/membre', icon: <DashboardIcon /> },
    ],
  },
  { title: 'Informations', items: [{ label: 'Événements', path: '/informations/evenements', icon: <EventIcon /> }] },
  {
    title: 'Finance',
    items: [
      { label: 'Mes cotisations', path: '/finance/cotisations', icon: <FinanceIcon /> },
      { label: 'Levées de fonds', path: '/finance/levees-fonds', icon: <FinanceIcon /> },
    ],
  },
  {
    title: 'Culturelle',
    items: [
      { label: 'Programme Kamil', path: '/culturelle/kamil', icon: <KamilIcon /> },
      { label: 'Mes juzz & Versements', path: '/culturelle/mes-progressions', icon: <PaymentIcon /> },
      { label: 'Activités religieuses', path: '/culturelle/activites-religieuses', icon: <MosqueIcon /> },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Messagerie', path: '/communication/messagerie', icon: <MessageIcon /> },
      { label: 'Notifications', path: '/communication/notifications', icon: <NotifIcon /> },
    ],
  },
  { title: 'Sociale', items: [{ label: 'Sociale', path: '/sociale/projets', icon: <SocialIcon /> }] },
  { title: 'Conservatoire', items: [{ label: 'Conservatoire', path: '/conservatoire', icon: <ConservatoireIcon /> }] },
  { title: 'Scientifique', items: [{ label: 'Cours', path: '/scientifique/cours', icon: <ScientifiqueIcon /> }] },
  { title: 'Organisation', items: [{ label: 'Matériels & activités', path: '/organisation/reunions', icon: <OrgIcon /> }] },
  { title: 'Comptes', items: [{ label: 'Mon profil', path: '/comptes/profil', icon: <PersonIcon /> }] },
]

const sectionsJewrin = [
  {
    title: 'Navigation',
    items: [
      { label: 'Page d\'accueil', path: '/accueil', icon: <HomeIcon /> },
      { label: 'Tableau de bord', path: '/jewrin', icon: <DashboardIcon /> },
    ],
  },
  {
    title: 'Culturelle',
    items: [
      { label: 'Programme Kamil', path: '/culturelle/kamil', icon: <KamilIcon /> },
      { label: 'Validations Kamil', path: '/culturelle/validations', icon: <ValidIcon /> },
      { label: 'Validations Versements', path: '/culturelle/validations-versements', icon: <PaymentIcon /> },
      { label: 'Activités religieuses', path: '/culturelle/activites-religieuses', icon: <MosqueIcon /> },
    ],
  },
  { title: 'Informations', items: [{ label: 'Événements', path: '/informations/evenements', icon: <EventIcon /> }] },
  {
    title: 'Communication',
    items: [
      { label: 'Messagerie', path: '/communication/messagerie', icon: <MessageIcon /> },
      { label: 'Notifications', path: '/communication/notifications', icon: <NotifIcon /> },
    ],
  },
  { title: 'Conservatoire', items: [{ label: 'Conservatoire', path: '/conservatoire', icon: <ConservatoireIcon /> }] },
  { title: 'Comptes', items: [{ label: 'Mon profil', path: '/comptes/profil', icon: <PersonIcon /> }] },
]

function MenuItemBtn({ item, selected, collapsed, onNavigate, onClose }) {
  const isAccueil = item.path === '/accueil'
  const btn = (
    <ListItemButton
      component={isAccueil ? RouterLink : 'div'}
      to={isAccueil ? item.path : undefined}
      selected={!isAccueil && selected}
      onClick={isAccueil ? () => onClose?.() : () => { onNavigate(item.path); onClose?.(); }}
      href={undefined}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        minHeight: 48,
        justifyContent: collapsed ? 'center' : 'flex-start',
        px: collapsed ? 1.5 : 2,
        transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        textDecoration: 'none',
        color: 'inherit',
        '&.Mui-selected': {
          backgroundColor: `${COLORS.vert}22`,
          color: COLORS.vert,
          borderLeft: `3px solid ${COLORS.vert}`,
          '&:hover': { backgroundColor: `${COLORS.vert}30` },
        },
        '&:hover': {
          backgroundColor: `${COLORS.or}20`,
          transform: 'translateX(4px)',
        },
      }}
    >
      <ListItemIcon
        sx={{
          color: selected ? COLORS.vert : COLORS.vertFonce,
          minWidth: collapsed ? 0 : 40,
          justifyContent: 'center',
          transition: 'color 0.2s ease',
        }}
      >
        {item.icon}
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: '0.9rem',
            fontWeight: selected ? 600 : 500,
            color: selected ? COLORS.vert : COLORS.vertFonce,
          }}
          sx={{ opacity: 1, transition: 'opacity 0.2s ease' }}
        />
      )}
    </ListItemButton>
  )
  return collapsed ? (
    <Tooltip title={item.label} placement="right" arrow>
      {btn}
    </Tooltip>
  ) : (
    btn
  )
}

function SidebarContent({ sections, location, navigate, collapsed, onClose }) {
  return (
    <List dense sx={{ px: collapsed ? 0 : 1, py: 0 }} disablePadding>
      {sections.map((group) => (
        <Box key={group.title} sx={{ mb: collapsed ? 1 : 1.5 }}>
          {!collapsed && (
            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 0.5,
                display: 'block',
                color: COLORS.or,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {group.title}
            </Typography>
          )}
          <List dense disablePadding sx={{ mt: 0.5 }}>
            {group.items.map((item) => {
              const selected = location.pathname === item.path
              return (
                <MenuItemBtn
                  key={`${group.title}-${item.path}`}
                  item={item}
                  selected={selected}
                  collapsed={collapsed}
                  onNavigate={navigate}
                  onClose={onClose}
                />
              )
            })}
          </List>
        </Box>
      ))}
    </List>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const sections = user?.role === 'admin' ? sectionsAdmin : user?.role === 'jewrin' ? sectionsJewrin : sectionsMembre
  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${COLORS.beigeClair} 0%, ${COLORS.beige} 100%)`,
        borderRight: `2px solid ${COLORS.or}`,
        boxShadow: `4px 0 24px ${COLORS.vert}18`,
        transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* En-tête sidebar — logo visible quand le menu est ouvert */}
      <Box
        sx={{
          p: collapsed ? 1.5 : 2,
          borderBottom: `1px solid ${COLORS.or}66`,
          minHeight: 80,
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
          gap: 1.5,
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Daara Barakatul Mahaahidi"
          sx={{
            height: collapsed ? 40 : 44,
            width: 'auto',
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
        {!collapsed && (
          <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: COLORS.vert, fontWeight: 600, display: 'block' }}>
              Daara Barakatul Mahaahidi
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.vertFonce, fontWeight: 600 }} noWrap>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" sx={{ color: COLORS.vert }}>
              {user?.role_display || user?.role}
            </Typography>
          </Box>
        )}
        {!isMobile && onToggleCollapse && (
          <Tooltip title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'} placement="right" arrow>
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              sx={{
                color: COLORS.vert,
                transition: 'all 0.25s ease',
                '&:hover': { backgroundColor: `${COLORS.or}30`, transform: 'scale(1.1)' },
              }}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Liste menu — scroll si besoin */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        <SidebarContent sections={sections} location={location} navigate={navigate} collapsed={collapsed} onClose={onClose} />
      </Box>
    </Box>
  )

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="left"
        open={open}
        onClose={onClose}
        onOpen={() => {}}
        sx={{
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            maxWidth: '85vw',
            boxSizing: 'border-box',
            background: COLORS.beigeClair,
            borderRight: `2px solid ${COLORS.or}`,
          },
        }}
      >
        {sidebarContent}
      </SwipeableDrawer>
    )
  }

  return (
    <Box
      className="sidebar-enter"
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1100,
        width: width,
        flexShrink: 0,
      }}
    >
      {sidebarContent}
    </Box>
  )
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED }
