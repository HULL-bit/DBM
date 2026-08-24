import { Box, Container, Typography, Paper, Link, Divider } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import logo from '/logo.png'

const C = { vert: '#2D5F3F', vertFonce: '#1e4029', or: '#C9A961', noir: '#1A1A1A' }

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ color: C.vert, fontWeight: 700, mb: 1 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: C.noir, lineHeight: 1.8 }} component="div">
        {children}
      </Typography>
    </Box>
  )
}

export default function PolitiqueConfidentialite() {
  return (
    <Box className="bg-auth bg-pattern" sx={{ minHeight: '100vh', py: { xs: 3, sm: 6 }, px: { xs: 1.5, sm: 2 } }}>
      <Container maxWidth="md">
        <Paper className="glass-card" sx={{ borderLeft: `4px solid ${C.or}`, borderRadius: 3, p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: 60, mb: 1.5 }} />
            <Typography variant="h4" className="title-script" sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}>
              Politique de confidentialité
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Daara Barakatul Mahaahidi — Plateforme de gestion (web et mobile)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Section title="1. Qui sommes-nous ?">
            La présente plateforme (application web et application mobile) est gérée par la Daara Barakatul
            Mahaahidi pour l'administration de sa communauté : gestion des membres, cotisations, programme
            Kamil, communication interne, conservatoire, et activités associées. Cette politique explique
            quelles données personnelles nous collectons auprès de nos membres, pourquoi, et comment elles
            sont utilisées et protégées.
          </Section>

          <Section title="2. Données que nous collectons">
            Lors de l'inscription et de l'utilisation de la plateforme, nous collectons : votre nom et
            prénom, votre email et numéro de téléphone, votre adresse, votre sexe, votre photo de profil
            (facultative), votre catégorie (élève, étudiant, professionnel), votre cellule et groupe
            sanguin (facultatifs), ainsi que les données liées à votre activité au sein de la Daara
            (cotisations et paiements déclarés, progression au programme Kamil, présence aux séances du
            conservatoire, messages échangés dans la messagerie et les canaux internes).
          </Section>

          <Section title="3. Pourquoi nous les utilisons">
            Ces informations servent exclusivement à la gestion de la vie associative de la Daara :
            identifier les membres, suivre les cotisations et paiements, organiser les activités
            culturelles et religieuses, permettre la communication entre membres, et produire des
            statistiques et rapports internes (bilans financiers, suivi de présence). Nous ne vendons ni
            ne partageons vos données avec des tiers à des fins commerciales.
          </Section>

          <Section title="4. Qui peut voir vos données">
            L'accès à vos informations est limité selon votre rôle et celui des autres utilisateurs
            (Administrateur, Jewrin, Membre) : un membre voit ses propres données et les informations
            publiques de la Daara ; les responsables (administrateurs, jewrins désignés par rubrique) ont
            accès aux données nécessaires à leurs fonctions de gestion (ex. le chargé de finance voit les
            cotisations, mais pas nécessairement les autres modules). Les messages échangés dans la
            messagerie et les canaux sont visibles par leurs destinataires et par les administrateurs
            habilités à la modération.
          </Section>

          <Section title="5. Conservation et sécurité">
            Vos données sont conservées tant que vous êtes membre actif de la Daara et selon la durée
            nécessaire à la tenue des registres associatifs (notamment financiers). L'accès aux données est
            protégé par une authentification (identifiant/mot de passe) et un système de permissions par
            rôle. Nous nous efforçons de protéger vos données contre tout accès non autorisé, mais aucun
            système n'est garanti totalement infaillible.
          </Section>

          <Section title="6. Vos droits">
            Vous pouvez à tout moment consulter et corriger vos informations personnelles depuis la page
            « Mon profil » de la plateforme. Pour toute demande de suppression de votre compte ou de vos
            données, ou pour toute question sur cette politique, vous pouvez contacter l'administration de
            la Daara directement.
          </Section>

          <Section title="7. Application mobile">
            L'application mobile utilise les mêmes comptes et les mêmes données que la plateforme web ;
            elle ne collecte pas de données supplémentaires en dehors de celles nécessaires à son
            fonctionnement (connexion, affichage de votre profil et des modules auxquels vous avez accès).
          </Section>

          <Section title="8. Modifications">
            Cette politique peut être mise à jour pour refléter des évolutions de la plateforme ou des
            exigences légales. La date de dernière mise à jour est indiquée en haut de cette page.
          </Section>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" sx={{ textAlign: 'center', color: C.vertFonce }}>
            <Link component={RouterLink} to="/accueil" underline="hover" sx={{ color: C.vert, fontWeight: 600 }}>
              ← Retour à l'accueil
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
