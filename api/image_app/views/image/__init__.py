from image_app.serializers import ImageSerializer
from image_app.models import Image, Label

from rest_framework import viewsets


class ImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    def get_queryset(self):

        labels = self.request.query_params.getlist('labels', [])
        unlabeled = self.request.query_params.get('unlabeled', False)

        if unlabeled:
            queryset = Image.objects.filter(labels=None)
        else:
            if len(labels) > 0:
                label_ids = Label.objects.filter(value__in=labels).values_list('id', flat=True)
                queryset = Image.objects.filter(labels__in=label_ids).distinct()
            else:
                queryset = Image.objects.all()

        return queryset
