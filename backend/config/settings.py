"""
Django settings for the TaskPulse V2 backend.

Every deploy-specific value comes from environment variables so the same code
runs locally (no env needed) and on Render (env set in the dashboard).
See backend/.env.example for the full list.
"""

import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# ── Core ────────────────────────────────────────────────────────────────────

DEBUG = env_bool("DJANGO_DEBUG", default=False)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-local-dev-only-key-do-not-use-in-production"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1" if DEBUG else "")
# Render sets this automatically to e.g. "taskpulse-api.onrender.com".
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)


# ── Applications ────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    "config.apps.MongoAdminConfig",
    "config.apps.MongoAuthConfig",
    "config.apps.MongoContentTypesConfig",
    "django.contrib.sessions",
    "django.contrib.messages",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    # Third party
    "corsheaders",
    "rest_framework",
    # Local
    "accounts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# ── Database (MongoDB) ──────────────────────────────────────────────────────
# MONGODB_URI is the full connection string, e.g. the MongoDB Atlas
# "mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/" string.
# MONGODB_NAME is the database inside the cluster.

MONGODB_URI = os.environ.get("MONGODB_URI") or ("mongodb://localhost:27017/" if DEBUG else None)
if not MONGODB_URI:
    raise ImproperlyConfigured("MONGODB_URI must be set when DJANGO_DEBUG is off.")

DATABASES = {
    "default": {
        "ENGINE": "django_mongodb_backend",
        "HOST": MONGODB_URI,
        "NAME": os.environ.get("MONGODB_NAME", "taskpulse"),
    }
}

# Django's built-in apps ship SQL-style migrations; these are regenerated for
# ObjectId primary keys (python manage.py makemigrations admin auth contenttypes).
MIGRATION_MODULES = {
    "admin": "mongo_migrations.admin",
    "auth": "mongo_migrations.auth",
    "contenttypes": "mongo_migrations.contenttypes",
}


# ── Auth ────────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"]
    + (["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
    "DEFAULT_THROTTLE_RATES": {
        "auth": os.environ.get("AUTH_THROTTLE_RATE", "20/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    # Rotated and logged-out refresh tokens are revoked via accounts.RevokedToken
    # (simplejwt's own blacklist app needs integer primary keys, which MongoDB lacks).
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# ── CORS / CSRF ─────────────────────────────────────────────────────────────
# The React app on Vercel talks to this API with a Bearer token, so no cookies
# cross sites. CORS just needs to allow the Vercel origin(s).

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173" if DEBUG else "",
)
# Optional, e.g. ^https://taskpulse-[a-z0-9-]+\.vercel\.app$ for preview deploys.
CORS_ALLOWED_ORIGIN_REGEXES = env_list("CORS_ALLOWED_ORIGIN_REGEXES")

# Needed for the Django admin form posts when served over HTTPS on Render.
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")


# ── Security (production only) ──────────────────────────────────────────────

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "3600"))
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Render's health check hits the app over plain HTTP internally.
    SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]


# ── i18n ────────────────────────────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ── Static files (served by WhiteNoise) ─────────────────────────────────────

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django_mongodb_backend.fields.ObjectIdAutoField"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.environ.get("DJANGO_LOG_LEVEL", "INFO")},
}
