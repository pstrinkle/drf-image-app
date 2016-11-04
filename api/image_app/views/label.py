from rest_framework import viewsets

from image_app.serializers import LabelSerializer
from image_app.models import Label


class LabelViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Label.objects.all()
    serializer_class = LabelSerializer


