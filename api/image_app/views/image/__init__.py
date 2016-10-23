from image_app.serializers import ImageSerializer
from image_app.models import Image, Label

from rest_framework import viewsets
from rest_framework.response import Response


class ImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    def list(self, request, **kwargs):
        """
        List the Images.
        """

        labels = request.query_params.getlist('labels', [])

        import sys
        from json import dumps
        sys.stderr.write('labels in query: %s\n' % dumps(labels))

        if len(labels) > 0:
            label_ids = Label.objects.filter(value__in=labels).values_list('id', flat=True)
            queryset = Image.objects.filter(labels__in=label_ids)
        else:
            queryset = Image.objects.all()

        serializer = ImageSerializer(queryset, many=True, context={'request': request})

        return Response(serializer.data)

