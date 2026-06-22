import { createTheme } from '@mui/material/styles'

// Palette stricte du logo Daara Barakatul Mahaahidi
// Vert (croissant) #2D5F3F | Or (bordure) #C9A961 | Beige (fond) #F4EAD5 | Noir (texte) #1A1A1A
const colors = {
  vert: '#2D5F3F',
  vertClair: '#3d7a52',
  vertFonce: '#1e4029',
  or: '#C9A961',
  orClair: '#ddc078',
  orFonce: '#b89447',
  beige: '#F4EAD5',
  beigeClair: '#faf5eb',
  noir: '#1A1A1A',
  blanc: '#FFFFFF',
}

const theme = createTheme({
  palette: {
    primary: {
      main: colors.vert,
      light: colors.vertClair,
      dark: colors.vertFonce,
      contrastText: colors.blanc,
    },
    secondary: {
      main: colors.or,
      light: colors.orClair,
      dark: colors.orFonce,
      contrastText: colors.noir,
    },
    background: {
      default: colors.beige,
      paper: colors.blanc,
    },
    text: {
      primary: colors.noir,
      secondary: colors.vertFonce,
    },
    success: { main: colors.vert },
    warning: { main: colors.or },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Arial", sans-serif',
    h1: { fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 700 },
    h2: { fontFamily: '"Dancing Script", "Cormorant Garamond", serif', fontWeight: 600 },
    h3: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 },
    h4: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: colors.vert,
          color: colors.blanc,
          '&:hover': { background: colors.vertFonce, transform: 'translateY(-1px)' },
        },
        outlined: {
          borderColor: colors.or,
          color: colors.vertFonce,
          '&:hover': { borderColor: colors.orFonce, backgroundColor: `${colors.or}18` },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          borderLeft: `3px solid ${colors.or}`,
          background: colors.blanc,
          boxShadow: `0 2px 12px ${colors.vert}12`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: `0 8px 24px ${colors.vert}20`,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: colors.beige,
          borderBottom: `2px solid ${colors.or}`,
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.or },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.vert, borderWidth: 2 },
          },
        },
      },
    },
  },
})

export default theme
export { colors }
