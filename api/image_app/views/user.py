from rest_framework import viewsets

from image_app.serializers import ImageUserSerializer
from image_app.models import ImageUser


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = ImageUser.objects.all()
    serializer_class = ImageUserSerializer


