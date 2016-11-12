from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from image_app.serializers import ImageSerializer
from image_app.models import Image, Label
from image_app.filters import LabelsFilter


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
    queryset = Image.objects.all()
    paginate_by_param = 'page_size'

    filter_backends = (DjangoFilterBackend,)
    filter_class = LabelsFilter
