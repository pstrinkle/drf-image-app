# -*- coding: utf-8 -*-
# Generated by Django 1.10.2 on 2016-10-23 23:51
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('image_app', '0003_auto_20161023_1543'),
    ]

    operations = [
        migrations.AlterField(
            model_name='label',
            name='value',
            field=models.CharField(max_length=256, unique=True),
        ),
    ]