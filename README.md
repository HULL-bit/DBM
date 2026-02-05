# Plateforme Daara Barakatul Mahaahidi

Plateforme web de gestion pour la Daara Barakatul Mahaahidi : interfaces par rôle (Administrateur, Membre, Jewrin), modules Informations, Finance, Culturelle (Kamil), Communication, Sociale, Conservatoire, Scientifique, Organisation.

## Charte graphique

- **Vert primaire** : #2D5F3F (croissant, actions)
- **Or / Doré** : #C9A961 (bordures, accents)
- **Beige** : #F4EAD5 (fonds)
- **Noir** : #1A1A1A (textes)
- Logo : présent dans le header

## Prérequis

- Python 3.10+
- Node.js 18+
- (Optionnel) PostgreSQL pour la production

## Installation

### Backend (Django)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py create_admin     # crée un compte admin de test (voir ci‑dessous)
python manage.py runserver
```

Le backend est disponible sur http://127.0.0.1:8000

### Compte administrateur pour les tests

Après avoir exécuté `python manage.py create_admin` :

- **Identifiant** : `admin`
- **Mot de passe** : `admin123`

Connectez-vous sur la page de connexion du frontend avec ces identifiants pour accéder au tableau de bord administrateur.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Le frontend est disponible sur http://localhost:5173 (proxy API vers le backend).

## Rôles

- **Administrateur** : gestion complète (membres, finance, événements, Kamil, etc.)
- **Membre** : profil, cotisations, Kamil, événements, messagerie
- **Jewrin** : validations Kamil, activités religieuses, enseignements

## Structure

- `backend/` : Django (apps accounts, informations, finance, culturelle, communication, sociale, conservatoire, scientifique, organisation)
- `frontend/` : React (Vite, MUI), Layout (Header avec logo, Sidebar par rôle, Footer), dashboards et pages par module

## Licence

Projet Daara Barakatul Mahaahidi.
