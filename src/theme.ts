import { createTheme } from '@mui/material/styles'

const cantonTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#F4B900',
      contrastText: '#000000',
    },
    secondary: {
      main: '#1A1A2E',
    },
    background: {
      default: '#0D0D1A',
      paper: '#1A1A2E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0C0',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export default cantonTheme
