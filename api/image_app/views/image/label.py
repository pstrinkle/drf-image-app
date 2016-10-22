from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from image_app.models import Label, Image


class LabelViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    def update(self, request, pk=None, image_pk=None, **kwargs):
        """
        Add a label to an image, the label and image must already exist.
        """

        image = get_object_or_404(Image.objects.all(), pk=image_pk)
        label = get_object_or_404(Label.objects.all(), pk=pk)

        image.labels.add(label)
        image.save()  # may not be a necessary step.

        return Response(status=status.HTTP_202_ACCEPTED)

    def destroy(self, request, pk=None, image_pk=None, **kwargs):
        """
        Remove a label from an image.
        """

        image = get_object_or_404(Image.objects.all(), pk=image_pk)
        label = get_object_or_404(Label.objects.all(), pk=pk)

        image.labels.remove(label)
        image.save()

        return Response(status=status.HTTP_202_ACCEPTED)
