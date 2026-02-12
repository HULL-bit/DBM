import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Link,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Login as LoginIcon,
  ChevronLeft,
  ChevronRight,
  LocationOn,
  Email,
  Phone,
  Campaign,
  Info,
  Groups,
  Place,
  AutoStories,
} from '@mui/icons-material'
import logo from '/logo.png'

const COLORS = {
  vert: '#2D5F3F',
  vertFonce: '#1e4029',
  or: '#C9A961',
  beige: '#F4EAD5',
  beigeClair: '#faf5eb',
  noir: '#1A1A1A',
  blanc: '#FFFFFF',
}

const CAROUSEL_SLIDES = [
  { img: '/images/accueil/carousel-1.png', titre: 'Notre guide', description: 'Portrait de Serigne Moustapha Salihou, figure spirituelle et pilier de la Daara.' },
  { img: '/images/accueil/carousel-2.png', titre: 'Salle de la Daara', description: 'Espace de rassemblement avec le portrait lumineux de Serigne Moustapha Aliou Mbacké, microphones et réhals pour les récitations.' },
  { img: '/images/accueil/carousel-3.png', titre: 'Étude et recueillement', description: 'Moment d\'étude religieuse et de transmission du savoir au sein de la Daara.' },
  { img: '/images/accueil/carousel-4.png', titre: 'Transmission du savoir', description: 'Consultation de manuscrits islamiques et enseignement traditionnel.' },
  { img: '/images/accueil/carousel-5.png', titre: 'Récitation et dévotion', description: 'Récital ou allocution lors d\'un événement communautaire.' },
  { img: '/images/accueil/carousel-6.png', titre: 'Rassemblement', description: 'Communauté réunie sous le portrait de Serigne Moustapha Saliou, bibliothèque et livres.' },
  { img: '/images/accueil/carousel-7.png', titre: 'Vie de la Daara', description: 'Membres et disciples en tenues traditionnelles, étude et partage.' },
  { img: '/images/accueil/carousel-8.png', titre: 'L\'inoubliable', description: 'Portrait de Serigne Moustapha Saliou Mbacké au cœur de nos rassemblements.' },
  { img: '/images/accueil/carousel-9.png', titre: 'Grande salle', description: 'Espace de conférences, récitations et enseignements avec équipement de sonorisation.' },
  { img: '/images/accueil/carousel-10.png', titre: 'Communauté', description: 'Membres de la Daara, jeunes et moins jeunes, dans un cadre de sérénité.' },
  { img: '/images/accueil/carousel-11.png', titre: 'Moments de partage', description: 'Rassemblements et activités communautaires de la Daara.' },
  { img: '/images/accueil/carousel-12.png', titre: 'Tradition et spiritualité', description: 'L\'héritage et les valeurs de la Daara Barakatul Mahaahidi.' },
]

export default function Accueil() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [carouselIndex, setCarouselIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setCarouselIndex((i) => (i + 1) % CAROUSEL_SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const navLinks = [
    { id: 'informations', label: 'Informations' },
    { id: 'guide', label: 'Notre guide' },
    { id: 'historique', label: 'Historique' },
    { id: 'realisations', label: 'Réalisations' },
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.beige }}>
      {/* Navbar accueil — design travaillé */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          background: `linear-gradient(135deg, ${COLORS.beige} 0%, ${COLORS.beigeClair} 50%, ${COLORS.beige} 100%)`,
          borderBottom: `3px solid ${COLORS.or}`,
          boxShadow: `0 6px 28px ${COLORS.vert}25, 0 2px 10px rgba(0,0,0,0.08)`,
          backdropFilter: 'saturate(1.1)',
        }}
      >
        <Box
          sx={{
            maxWidth: 1500,
            mx: 'auto',
            px: { xs: 2.5, md: 4 },
            py: { xs: 2, md: 2.8 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="img"
              src={logo}
              alt="Daara Barakatul Mahaahidi"
              sx={{
                height: { xs: 60, md: 72 },
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
              }}
            />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: COLORS.vert,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 700,
                  fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
                  lineHeight: 1.2,
                }}
              >
                Daara Barakatul Mahaahidi
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.vertFonce, fontWeight: 600, display: 'block' }}>
                Wakeur Serigne Moustapha Salihou
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isMobile && (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  px: 2,
                  py: 0.8,
                  borderRadius: 2,
                  bgcolor: `${COLORS.vert}08`,
                  border: `1px solid ${COLORS.or}66`,
                }}
              >
                {navLinks.map(({ id, label }) => (
                  <Link
                    key={id}
                    component="button"
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(id)
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    sx={{
                      color: COLORS.vertFonce,
                      fontSize: '0.9rem',
                      px: 1.5,
                      py: 0.9,
                      borderRadius: 1,
                      textDecoration: 'none',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      '&:hover': { color: COLORS.or, bgcolor: `${COLORS.or}20` },
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </Box>
            )}
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size="small"
              startIcon={<LoginIcon />}
              sx={{
                borderColor: COLORS.vert,
                color: COLORS.vert,
                px: 1.5,
                py: 0.6,
                fontSize: '0.875rem',
                borderRadius: 2,
                '&:hover': { borderColor: COLORS.vertFonce, bgcolor: `${COLORS.or}15` },
              }}
            >
              Connexion
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Carrousel — images légèrement floues, titre en foncé, description par slide */}
      <Box sx={{ pt: { xs: 11, md: 12 }, position: 'relative' }}>
        <Box
          sx={{
            height: { xs: 520, sm: 680, md: 920 },
            minHeight: { xs: 480, sm: 640, md: 860 },
            overflow: 'hidden',
            position: 'relative',
            bgcolor: COLORS.vertFonce,
          }}
        >
          {CAROUSEL_SLIDES.map((slide, i) => (
            <Box
              key={slide.img}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: i === carouselIndex ? 1 : 0,
                transition: 'opacity 0.8s ease-in-out',
                zIndex: i === carouselIndex ? 1 : 0,
              }}
            >
              <Box
                component="img"
                src={slide.img}
                alt={slide.titre}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 25%',
                  filter: 'blur(6px)',
                  transform: 'scale(1.05)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, rgba(26,26,26,0.4) 0%, transparent 30%, transparent 70%, rgba(26,26,26,0.85) 100%)',
                  pointerEvents: 'none',
                }}
              />
            </Box>
          ))}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              p: 3,
              textAlign: 'center',
              maxWidth: '90%',
            }}
          >
            <Typography
              component="h1"
              className="title-script"
              sx={{
                color: COLORS.beigeClair,
                textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
                fontSize: { xs: '3.4rem', sm: '4.2rem', md: '5.2rem', lg: '6.4rem' },
                mb: 0.75,
                lineHeight: 1.25,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Daara Barakatul Mahaahidi
            </Typography>
            <Typography
              component="p"
              sx={{
                color: COLORS.or,
                fontFamily: '"Cormorant Garamond", serif',
                fontWeight: 900,
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                mb: 1.5,
              }}
            >
              Wakeur Serigne Moustapha Salihou
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: COLORS.or,
                fontWeight: 800,
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                mb: 1,
              }}
            >
              {CAROUSEL_SLIDES[carouselIndex].titre}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: COLORS.beige,
                maxWidth: 560,
                mx: 'auto',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
              }}
            >
              {CAROUSEL_SLIDES[carouselIndex].description}
            </Typography>
          </Box>
          <IconButton
            onClick={() => setCarouselIndex((i) => (i - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              color: COLORS.blanc,
              bgcolor: 'rgba(0,0,0,0.45)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            onClick={() => setCarouselIndex((i) => (i + 1) % CAROUSEL_SLIDES.length)}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              color: COLORS.blanc,
              bgcolor: 'rgba(0,0,0,0.45)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
          >
            <ChevronRight />
          </IconButton>
          <Box sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {CAROUSEL_SLIDES.map((_, i) => (
              <Box
                key={i}
                onClick={() => setCarouselIndex(i)}
                sx={{
                  width: i === carouselIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 1,
                  bgcolor: i === carouselIndex ? COLORS.or : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ py: 10 }}>
        {/* Section Informations */}
        <Box sx={{ mb: 12 }} id="informations">
          <Typography variant="h4" sx={{ color: COLORS.vert, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info /> Informations
          </Typography>
          <Box
            sx={{
              p: 5,
              minHeight: 280,
              borderRadius: 3,
              borderLeft: `4px solid ${COLORS.or}`,
              bgcolor: COLORS.beigeClair,
              backgroundImage: 'url(/images/accueil/carousel-2.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                bgcolor: 'rgba(244,234,213,0.88)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 2 }}>
                Bienvenue à la Daara Barakatul Mahaahidi
              </Typography>
              <Typography sx={{ color: COLORS.noir, mb: 2 }}>
                La Daara Barakatul Mahaahidi Wakeur Serigne Moustapha Salihou est un lieu d'enseignement, de spiritualité et de vie communautaire. 
                Elle œuvre pour la transmission du savoir islamique, l'éducation des jeunes et le renforcement des liens fraternels.
              </Typography>
              <Typography sx={{ color: COLORS.noir }}>
                Retrouvez ici les actualités, les événements, les annonces et les réalisations de notre communauté.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Section Annonces / Publicités */}
        <Box sx={{ mb: 12 }} id="annonces">
          <Typography variant="h4" sx={{ color: COLORS.vert, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Campaign /> Annonces et publicités
          </Typography>
          <Grid container spacing={2}>
            {[
              { titre: 'Prochain événement', texte: 'Grande conférence et récitation à la Daara. Toute la communauté est conviée.' },
              { titre: 'Inscriptions Kamil', texte: 'Les inscriptions au programme Kamil sont ouvertes. Renseignez-vous auprès des responsables.' },
              { titre: 'Cotisations', texte: 'Pensez à régulariser vos cotisations pour soutenir les activités de la Daara.' },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.or}`, borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: COLORS.vert }}>{item.titre}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.texte}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Section Serigne Moustapha Saliou et la Daara */}
        <Box
          sx={{
            mb: 12,
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            minHeight: 440,
            backgroundImage: 'url(/images/accueil/carousel-1.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: `0 12px 40px ${COLORS.vert}30`,
          }}
          id="guide"
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(45,95,63,0.82)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 6,
              textAlign: 'center',
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ color: COLORS.or, fontFamily: '"Dancing Script", serif', fontWeight: 700, mb: 2 }}>
                Serigne Moustapha Saliou et la Daara
              </Typography>
              <Typography variant="h5" sx={{ color: COLORS.beigeClair, fontWeight: 600, mb: 2 }}>
                Notre guide
              </Typography>
              <Typography sx={{ color: COLORS.beige, maxWidth: 640, mx: 'auto' }}>
                Serigne Moustapha Saliou Mbacké, l'inoubliable, est le guide spirituel et le pilier de la Daara Barakatul Mahaahidi. 
                Son enseignement, sa sagesse et sa bienveillance inspirent notre communauté au quotidien. La Daara perpétue son héritage 
                à travers l'éducation, la récitation et le vivre-ensemble.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Section Historique de la Daara */}
        <Box sx={{ mb: 12 }} id="historique">
          <Typography
            variant="h4"
            sx={{
              color: COLORS.vert,
              mb: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontFamily: '"Cormorant Garamond", serif',
            }}
          >
            Historique de la Daara
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: 3,
                  borderLeft: `4px solid ${COLORS.or}`,
                  bgcolor: COLORS.beigeClair,
                  boxShadow: `0 8px 28px ${COLORS.vert}18`,
                }}
              >
                <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 2 }}>
                  Aux origines de la Daara Barakatul Mahaahidi
                </Typography>
                <Typography sx={{ color: COLORS.noir, mb: 1.5 }}>
                  La Daara Barakatul Mahaahidi est née de la volonté de préserver et de diffuser l&apos;héritage spirituel de Serigne
                  Moustapha Saliou Mbacké. Autour de son enseignement, des disciples et des familles se sont progressivement réunis
                  pour former un lieu vivant d&apos;apprentissage, de recueillement et de solidarité.
                </Typography>
                <Typography sx={{ color: COLORS.noir, mb: 1.5 }}>
                  Au fil des années, la Daara s&apos;est structurée : mise en place d&apos;espaces d&apos;enseignement, organisation de
                  dahiras, cercles de récitation et activités sociales au service de la communauté. Aujourd&apos;hui, elle poursuit cette
                  mission en s&apos;adaptant aux besoins des jeunes et des familles.
                </Typography>
                <Typography sx={{ color: COLORS.noir }}>
                  La plateforme numérique Barakatul Mahaahidi s&apos;inscrit dans cette continuité : offrir un outil moderne pour mieux
                  organiser les activités, suivre les programmes, gérer les contributions et renforcer les liens entre les membres de la
                  Daara, où qu&apos;ils se trouvent.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  height: '100%',
                  border: `2px solid ${COLORS.or}`,
                  boxShadow: `0 10px 34px ${COLORS.vert}25`,
                }}
              >
                <CardMedia
                  component="img"
                  height="260"
                  image="/images/accueil/carousel-3.png"
                  alt="Moments de transmission à la Daara"
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography variant="subtitle1" sx={{ color: COLORS.vertFonce, fontWeight: 600, mb: 1 }}>
                    Une histoire qui continue de s&apos;écrire
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Chaque génération apporte sa contribution : en participant aux activités, en soutenant les projets et en portant les
                    valeurs de la Daara Barakatul Mahaahidi dans sa vie quotidienne.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Section Réalisations — plus d'images */}
        <Box sx={{ mb: 12 }} id="realisations">
          <Typography variant="h4" sx={{ color: COLORS.vert, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoStories /> Réalisations
          </Typography>
          <Grid container spacing={3}>
            {[
              { img: 4, titre: 'Transmission du savoir', desc: 'Étude des textes et enseignement traditionnel.' },
              { img: 5, titre: 'Récitation et dévotion', desc: 'Récitals et événements communautaires.' },
              { img: 6, titre: 'Rassemblements', desc: 'Communauté réunie sous le portrait du guide.' },
              { img: 8, titre: 'L\'inoubliable', desc: 'Serigne Moustapha Saliou au cœur de la Daara.' },
              { img: 9, titre: 'Grande salle', desc: 'Conférences et enseignements.' },
              { img: 10, titre: 'Vie communautaire', desc: 'Membres de tous âges, sérénité et partage.' },
            ].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.img}>
                <Card sx={{ borderRadius: 2, overflow: 'hidden', borderLeft: `4px solid ${COLORS.or}`, boxShadow: `0 4px 20px ${COLORS.vert}15`, minHeight: 320 }}>
                  <CardMedia
                    component="img"
                    height="260"
                    image={`/images/accueil/carousel-${item.img}.png`}
                    alt={item.titre}
                    sx={{ objectFit: 'cover', '&:hover': { transform: 'scale(1.02)' }, transition: 'transform 0.4s ease' }}
                  />
                  <CardContent>
                    <Typography variant="h6" sx={{ color: COLORS.vert }}>{item.titre}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Galerie — encore plus d'images */}
        <Box sx={{ mb: 12 }} id="galerie">
          <Typography variant="h4" sx={{ color: COLORS.vert, mb: 4 }}>Galerie</Typography>
          <Grid container spacing={2}>
            {[1, 2, 3, 7, 11, 12].map((i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Box
                  component="img"
                  src={`/images/accueil/carousel-${i}.png`}
                  alt={`Galerie ${i}`}
                  sx={{
                    width: '100%',
                    height: 220,
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: `2px solid ${COLORS.or}`,
                    boxShadow: `0 4px 12px ${COLORS.vert}20`,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': { transform: 'scale(1.03)', boxShadow: `0 8px 24px ${COLORS.vert}30` },
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Section Membres (aperçu) */}
        <Box sx={{ mb: 12 }} id="membres">
          <Typography variant="h4" sx={{ color: COLORS.vert, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Groups /> Aperçu des membres
          </Typography>
          <Box
            sx={{
              p: 5,
              minHeight: 280,
              borderRadius: 3,
              borderLeft: `4px solid ${COLORS.or}`,
              bgcolor: COLORS.beigeClair,
              backgroundImage: 'url(/images/accueil/carousel-7.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                bgcolor: 'rgba(244,234,213,0.85)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h6" sx={{ color: COLORS.vertFonce, mb: 2 }}>
                Une communauté soudée
              </Typography>
              <Typography sx={{ color: COLORS.noir }}>
                La Daara rassemble des membres de tous âges : administrateurs, membres actifs et Jewrin qui œuvrent ensemble 
                pour l'enseignement, les cotisations, le programme Kamil, les événements et la vie associative. Rejoignez-nous 
                en vous connectant à la plateforme pour accéder à votre espace.
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                sx={{ mt: 2, borderColor: COLORS.vert, color: COLORS.vert, '&:hover': { borderColor: COLORS.vertFonce, bgcolor: `${COLORS.or}20` } }}
              >
                Accéder à mon espace
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Section Localisation */}
        <Box sx={{ mb: 12 }} id="localisation">
          <Typography variant="h4" sx={{ color: COLORS.vert, mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Place /> Localisation
          </Typography>
          <Typography sx={{ color: COLORS.noir, mb: 3 }}>
            Mbacké Daru Salam, Sénégal
          </Typography>
          <Box
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `2px solid ${COLORS.or}`,
              boxShadow: `0 8px 24px ${COLORS.vert}20`,
              height: 520,
            }}
          >
            <iframe
              title="Carte Mbacké Daru Salam, Sénégal"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-15.95%2C14.75%2C-15.85%2C14.85%2C&layer=mapnik&marker=14.8%2C-15.9"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Box>
          <Link
            href="https://www.openstreetmap.org/?mlat=14.8&mlon=-15.9#map=14/14.8/-15.9"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1.5, color: COLORS.vert, fontWeight: 600 }}
          >
            <LocationOn fontSize="small" /> Ouvrir dans OpenStreetMap
          </Link>
        </Box>
      </Container>

      {/* Footer Contact */}
      <Box
        component="footer"
        sx={{
          py: 6,
          px: 2,
          background: `linear-gradient(180deg, ${COLORS.vertFonce} 0%, ${COLORS.vert} 100%)`,
          color: COLORS.beige,
        }}
        id="contact"
      >
        <Container maxWidth="lg">
          <Typography variant="h5" sx={{ color: COLORS.or, mb: 4, fontFamily: '"Cormorant Garamond", serif' }}>
            Contact
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Place sx={{ color: COLORS.or }} />
                <Typography>Mbacké Daru Salam, Sénégal</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Phone sx={{ color: COLORS.or }} />
                <Link href="tel:+221331234567" sx={{ color: COLORS.beige, textDecoration: 'none' }}>+221 33 123 45 67</Link>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Email sx={{ color: COLORS.or }} />
                <Link href="mailto:contact@daara-barakatul.local" sx={{ color: COLORS.beige, textDecoration: 'none' }}>contact@daara-barakatul.local</Link>
              </Box>
            </Grid>
          </Grid>
          <Typography variant="body2" sx={{ mt: 4, opacity: 0.9 }}>
            © {new Date().getFullYear()} Daara Barakatul Mahaahidi Wakeur Serigne Moustapha Salihou — Plateforme de gestion
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
