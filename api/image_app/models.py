from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import AbstractUser


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

    # How we connect labels / tags / people
    labels = models.ManyToManyField('Label', related_name='images')


class Label(models.Model):
    """
    These are how we tag images.
    """

    value = models.CharField(max_length=256)

