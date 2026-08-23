import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-dev-key-change-in-production')

DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'apps.accounts',
    'apps.informations',
    'apps.finance',
    'apps.culturelle',
    'apps.communication',
    'apps.sociale',
    'apps.conservatoire',
    'apps.scientifique',
    'apps.organisation',
    'apps.bibliotheque',
]

AUTH_USER_MODEL = 'accounts.CustomUser'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.locale.LocaleMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Base locale (développement) : SQLite.
# En production (Render, etc.), définir la variable d'environnement DATABASE_URL
# avec une URL PostgreSQL, par ex :
# postgresql://user:password@host:port/dbname
#
# Exemple concret Render pour ce projet :
# postgresql://dbm_2tbv_user:Dha1WFC0tQpxsNAFvQxlMRbfKMy0QOyG@dpg-d625k22li9vc73c2bks0-a.oregon-postgres.render.com/dbm_2tbv
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    import urllib.parse as urlparse

    urlparse.uses_netloc.append('postgres')
    url = urlparse.urlparse(DATABASE_URL)

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': url.path[1:],
            'USER': url.username,
            'PASSWORD': url.password,
            'HOST': url.hostname,
            'PORT': url.port or 5432,
            'OPTIONS': {
                'sslmode': 'require',
            },
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Dakar'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Stockage des médias : S3 (persistant après redéploiement) si configuré, sinon disque local
USE_S3_MEDIA = bool(os.environ.get('AWS_STORAGE_BUCKET_NAME'))

if USE_S3_MEDIA:
    # Les fichiers restent disponibles après redéploiement (Render, etc.)
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
            'OPTIONS': {
                'bucket_name': os.environ.get('AWS_STORAGE_BUCKET_NAME'),
                'access_key': os.environ.get('AWS_ACCESS_KEY_ID'),
                'secret_key': os.environ.get('AWS_SECRET_ACCESS_KEY'),
                'region_name': os.environ.get('AWS_S3_REGION_NAME', 'us-east-1'),
                'custom_domain': os.environ.get('AWS_S3_CUSTOM_DOMAIN') or None,
                'endpoint_url': os.environ.get('AWS_S3_ENDPOINT_URL') or None,
                'location': os.environ.get('AWS_S3_MEDIA_LOCATION', 'media'),
                'file_overwrite': False,
                'querystring_auth': os.environ.get('AWS_QUERYSTRING_AUTH', 'true').lower() == 'true',
                # Cloudflare R2 (et certains autres fournisseurs S3-compatibles) exigent SigV4.
                'addressing_style': 'virtual',
                'signature_version': 's3v4',
            },
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }
    # URL des médias : uniquement informatif (S3Boto3Storage génère ses propres URLs, signées si
    # nécessaire, via storage.url() — ce MEDIA_URL n'est pas utilisé pour servir les fichiers).
    if os.environ.get('AWS_S3_CUSTOM_DOMAIN'):
        MEDIA_URL = f"https://{os.environ['AWS_S3_CUSTOM_DOMAIN']}/{os.environ.get('AWS_S3_MEDIA_LOCATION', 'media')}/"
    elif os.environ.get('AWS_S3_ENDPOINT_URL'):
        MEDIA_URL = f"{os.environ['AWS_S3_ENDPOINT_URL']}/{os.environ.get('AWS_STORAGE_BUCKET_NAME')}/{os.environ.get('AWS_S3_MEDIA_LOCATION', 'media')}/"
    else:
        MEDIA_URL = f"https://{os.environ.get('AWS_STORAGE_BUCKET_NAME')}.s3.{os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')}.amazonaws.com/{os.environ.get('AWS_S3_MEDIA_LOCATION', 'media')}/"
else:
    # Pas de STORAGES : Django utilise le stockage fichier par défaut (MEDIA_ROOT)
    # Créer le répertoire des médias en local pour que les PDF soient sauvegardés
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    (MEDIA_ROOT / 'bibliotheque' / 'livres').mkdir(parents=True, exist_ok=True)
    (MEDIA_ROOT / 'bibliotheque' / 'livres' / 'alquran').mkdir(parents=True, exist_ok=True)
    (MEDIA_ROOT / 'bibliotheque' / 'livres' / 'qassida').mkdir(parents=True, exist_ok=True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Notifications externes (passerelle WhatsApp / SMS)
PUSH_ENABLED = os.environ.get('PUSH_ENABLED', 'False').lower() == 'true'
PUSH_GATEWAY_URL = os.environ.get('PUSH_GATEWAY_URL', 'https://dbmgt-sxc2.onrender.com')
PUSH_GATEWAY_TOKEN = os.environ.get('PUSH_GATEWAY_TOKEN', 'super_token_dbm_2025')

# Email (utilisé notamment pour la réinitialisation de mot de passe).
# En dev (DEBUG=True) et si aucun EMAIL_HOST_USER n'est fourni, les emails sont
# simplement affichés dans la console au lieu d'être envoyés réellement.
if os.environ.get('EMAIL_HOST_USER'):
    EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'no-reply@daara-barakatul-mahaahidi.local')

# Web Push (notifications directement sur l'appareil, même application/onglet fermé).
# Clés générées une fois (VAPID) : la clé publique est sans risque à exposer au frontend,
# la clé privée doit rester une variable d'environnement secrète.
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'mailto:contact@daara-barakatul-mahaahidi.local')

# Limite d'upload (PDF bibliothèque, pièces jointes de canaux : images/documents/audio/vidéo)
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024

# CORS
CORS_ALLOW_ALL_ORIGINS = DEBUG

_extra_origins = [
    o.strip()
    for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if o.strip()
]

CORS_ALLOWED_ORIGINS = (
    [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://dbm-0yic.onrender.com',
    ] + _extra_origins
) if not DEBUG else []

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
