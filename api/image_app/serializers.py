
from django.contrib.auth.models import User, Group
from rest_framework import serializers
from rest_framework.serializers import PrimaryKeyRelatedField
from django.apps import apps

from image_app.models import *


class ImageSerializer(serializers.HyperlinkedModelSerializer):
    """
    RW Image serializer.
    """

    labels = PrimaryKeyRelatedField(many=True, read_only=True)

    def create(self, validated_data):
        validated_data['size'] = validated_data['file'].size

        return Image.objects.create(**validated_data)

    class Meta:
        model = apps.get_model('image_app.Image')
        fields = ('size', 'added', 'file', 'id', 'labels')
        read_only_fields = ('size',)


class LabelSerializer(serializers.HyperlinkedModelSerializer):
    """
    RW Label serializer.
    """

    # We don't want to list the Customers for this M2M relationship, I just put this line for completeness.
    # images = PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = apps.get_model('image_app.Label')
        fields = ('value', 'id')


class ImageUserSerializer(serializers.HyperlinkedModelSerializer):
    """
    RW ImageUser serializer.
    """

    # input
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password', 'placeholder': 'Password'}
    )

    def create(self, validated_data):
        """
        Create the user.
        """

        user = ImageUser.objects.create(**validated_data)
        user.set_password(validated_data['password'])
        user.save()

        return user

    class Meta:
        model = apps.get_model('image_app.ImageUser')
        fields = ('added', 'email', 'username', 'password', 'first_name', 'last_name', 'id')
        write_only_fields = ('password',)



