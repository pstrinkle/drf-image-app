from rest_framework import viewsets
from rest_framework.metadata import SimpleMetadata
from rest_framework import filters

from image_app.serializers import LabelSerializer
from image_app.models import Label, alphanumeric


class LabelMetadata(SimpleMetadata):
    """
    Custom Metadata handler to get the regex validator output into the options.
    """

    def determine_metadata(self, request, view):
        metadata = super(LabelMetadata, self).determine_metadata(request, view)

        if 'actions' in metadata and 'POST' in metadata['actions']:
            if 'value' in metadata['actions']['POST']:
                metadata['actions']['POST']['value']['pattern'] = alphanumeric.regex.pattern

        return metadata


class LabelViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Label.objects.all()
    serializer_class = LabelSerializer

    filter_backends = (filters.SearchFilter,)
    metadata_class = LabelMetadata
    search_fields = ('value',)


