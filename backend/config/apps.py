"""Django's built-in apps, switched to MongoDB ObjectId primary keys.

MongoDB has no auto-incrementing integers, so every model's primary key is an
ObjectId. These configs apply that to admin, auth and contenttypes, whose
MongoDB-compatible migrations live in backend/mongo_migrations/.
"""

from django.contrib.admin.apps import AdminConfig
from django.contrib.auth.apps import AuthConfig
from django.contrib.contenttypes.apps import ContentTypesConfig

OBJECT_ID_FIELD = "django_mongodb_backend.fields.ObjectIdAutoField"


class MongoAdminConfig(AdminConfig):
    default_auto_field = OBJECT_ID_FIELD


class MongoAuthConfig(AuthConfig):
    default_auto_field = OBJECT_ID_FIELD


class MongoContentTypesConfig(ContentTypesConfig):
    default_auto_field = OBJECT_ID_FIELD
