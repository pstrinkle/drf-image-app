from image_app.serializers import ImageSerializer
from image_app.models import Image

from rest_framework import viewsets


class ImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Image.objects.all()
    serializer_class = ImageSerializer


