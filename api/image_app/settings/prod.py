

from image_app.settings.base import *
import os

DEBUG = False
ALLOWED_HOSTS = ['*']

DATABASES = {
    'default': {
        # I've also seen django.db.backends.postgresql as the engine.
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': os.environ.get('DB_ENV_DB', 'postgres'),
        'USER': os.environ.get('DB_ENV_POSTGRES_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_ENV_POSTGRES_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_PORT_5432_TCP_ADDR', 'db'),
        'PORT': os.environ.get('DB_PORT_5432_TCP_PORT', 5432),
    }
}

# MEDIA_ROOT is used for saving incoming media.
# for production use.
MEDIA_ROOT = '/media'
