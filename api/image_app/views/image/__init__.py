from image_app.serializers import ImageSerializer
from image_app.models import Image, Label

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets
from rest_framework import status
from rest_framework.response import Response


@method_decorator(csrf_exempt, name='dispatch')
class ImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Image.objects.all()
    serializer_class = ImageSerializer

    def create(self, request, **kwargs):
        """
        Create but return 201 on success.
        """

        serializer_class = self.get_serializer_class()

        serializer = serializer_class(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, **kwargs):
        """
        List the Images.
        """

        labels = request.query_params.getlist('labels', [])
        unlabeled = request.query_params.get('unlabeled', False)

        import sys
        from json import dumps
        sys.stderr.write('labels in query: %s\n' % dumps(labels))

        if unlabeled:
            queryset = Image.objects.filter(labels=None)
        else:
            if len(labels) > 0:
                label_ids = Label.objects.filter(value__in=labels).values_list('id', flat=True)
                queryset = Image.objects.filter(labels__in=label_ids).distinct()
            else:
                queryset = Image.objects.all()

        serializer = ImageSerializer(queryset, many=True, context={'request': request})

        return Response(serializer.data)

