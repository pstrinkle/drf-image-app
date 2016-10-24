from image_app.serializers import ImageSerializer
from image_app.models import Image, Label

from rest_framework import viewsets
from rest_framework.response import Response
import os
import StringIO
import zipfile


class ImageDownloadViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    def list(self, request, **kwargs):
        """
        List the Images.
        """

        images = request.query_params.getlist('images', [])

        import sys
        from json import dumps
        sys.stderr.write('labels in query: %s\n' % dumps(images))

        if len(images) > 0:
            queryset = Image.objects.filter(id__in=images)
        else:
            queryset = Image.objects.none()

        #serializer = ImageSerializer(queryset, many=True, context={'request': request})
        filenames = []
        for image in list(queryset):
            filenames.append(image.file)

        sys.stderr.write('filenames: %s\n' % dumps(filenames))

        return Response('')

