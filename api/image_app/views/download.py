from image_app.serializers import ImageSerializer
from image_app.models import Image, Label

from rest_framework import viewsets
from rest_framework.response import Response
from django.http import HttpResponse

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

        filenames = []
        for image in list(queryset):
            filenames.append(image.file.path)

        sys.stderr.write('filenames: %s\n' % dumps(filenames))

        zip_subdir = "files"
        zip_filename = "%s.zip" % zip_subdir
        s = StringIO.StringIO()
        zf = zipfile.ZipFile(s, "w")

        for fpath in filenames:
            fdir, fname = os.path.split(fpath)
            zip_path = os.path.join(zip_subdir, fname)
            zf.write(fpath, zip_path)

        zf.close()

        resp = HttpResponse(s.getvalue(), content_type = "application/x-zip-compressed")
        resp['Content-Disposition'] = 'attachment; filename=%s' % zip_filename

        return resp

