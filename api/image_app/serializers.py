from django.apps import apps
from easy_thumbnails.templatetags.thumbnail import thumbnail_url
from rest_framework import serializers

from image_app.models import *


class ThumbnailSerializer(serializers.ImageField):
    """
    For use in the serializer.
    """

    def to_representation(self, instance):
        return thumbnail_url(instance, 'small')


class ImageSerializer(serializers.HyperlinkedModelSerializer):
    """
    RW Image serializer.
    """

    labels = serializers.SerializerMethodField(read_only=True)
    thumbnail = serializers.SerializerMethodField(read_only=True)

    def get_thumbnail(self, obj):
        """
        I wrote this because it (by default) returns the full path, and with nginx serving the media and static, it
        is unhappy.  Also, this working when running directly via manage.py  So, win-win.
        """

        return obj.thumbnail.url

    def get_labels(self, obj):
        """
        Get the labels themselves.
        """

        qs = Label.objects.filter(pk__in=obj.labels.all())
        return list(qs.values_list('value', flat=True))

    def create(self, validated_data):
        validated_data['size'] = validated_data['file'].size
        validated_data['thumbnail'] = validated_data['file']

        img = Image.objects.create(**validated_data)

        return img

    class Meta:
        model = apps.get_model('image_app.Image')
        fields = ('size', 'added', 'file', 'id',
                  'labels', 'thumbnail')
        read_only_fields = ('size', )


class LabelSerializer(serializers.HyperlinkedModelSerializer):
    """
    RW Label serializer.
    """

    # We don't want to list the Customers for this M2M relationship, I just put this line for completeness.
    # images = PrimaryKeyRelatedField(many=True, read_only=True)

    count = serializers.SerializerMethodField(read_only=False)

    def get_count(self, obj):
        """
        I want the count of images with this label.
        """

        count = Image.objects.filter(labels__in=[obj.id]).count()
        return count

    def create(self, validated_data):
        """
        Create the user.
        """

        validated_data['value'] = validated_data['value'].lower()

        label = Label.objects.create(**validated_data)
        label.save()

        return label

    class Meta:
        model = apps.get_model('image_app.Label')
        fields = ('value', 'count', 'id')


class ImageUserSerializer(serializers.HyperlinkedModelSerializer):
    """
    RW ImageUser serializer.
    """

    # input
    password = serializers.CharField(
        write_only=True,
        style={
            'input_type': 'password',
            'placeholder': 'Password'
        }
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
        fields = ('added', 'email', 'username',
                  'password', 'first_name',
                  'last_name', 'id')
        write_only_fields = ('password',)


class LoginUserSerializer(serializers.HyperlinkedModelSerializer):
    """
    Login output serializer.
    """

    class Meta:
        model = apps.get_model('image_app.ImageUser')
        fields = ('email', 'username', 'first_name',
                  'last_name', 'id')

