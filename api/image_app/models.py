from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, MinLengthValidator

from easy_thumbnails.signals import saved_file
from easy_thumbnails.signal_handlers import generate_aliases_global
from easy_thumbnails import fields

from sanitizer.models import SanitizedCharField, SanitizedTextField

saved_file.connect(generate_aliases_global)

alphanumeric = RegexValidator(r'^[0-9a-zA-Z]*$', 'Only alphanumeric characters are allowed.')
minlength = MinLengthValidator(3, message='Field value must be at least 3 characters long')


class ImageUser(AbstractUser):
    """
    Our custom user.
    """

    added = models.DateTimeField(auto_now_add=True)


class Image(models.Model):
    """
    How we store the image.
    """

    added = models.DateTimeField(auto_now_add=True)

    size = models.IntegerField(default=0)

    # How we track stored images.
    file = models.ImageField()
    thumbnail = fields.ThumbnailerImageField(upload_to='thumbnails',
                                             resize_source=dict(size=(160, 160), sharpen=True),
                                             blank=True)

    # How we connect labels / tags / people
    labels = models.ManyToManyField('Label', related_name='images')


class Label(models.Model):
    """
    These are how we tag images.
    """

    value = SanitizedCharField(max_length=256, unique=True, validators=[alphanumeric, minlength])

