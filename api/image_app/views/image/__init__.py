from image_app.serializers import ImageSerializer
from image_app.models import Image, Label

from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    """

    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


class ImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    pagination_class = StandardResultsSetPagination
    serializer_class = ImageSerializer
    paginate_by_param = 'page_size'

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
