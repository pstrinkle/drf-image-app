from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic.base import TemplateView
from django.views.generic import View

from django.utils.decorators import method_decorator
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseNotFound
from django.conf import settings
import os


class IndexView(TemplateView):
    template_name = 'index.html'

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        request_path = request.path[1:]
        if len(request_path) == 0:
            request_path = 'index.html'

        return render(request, request_path, {})


class ImageView(View):
    """
    Because the /media/ isn't working...
    """

    def get(self, request, *args, **kwargs):
        request_path = request.path.replace(settings.MEDIA_URL, '')
        file_type = request_path.split('.')[-1]

        file_path = os.path.join(settings.MEDIA_ROOT, request_path)

        if file_type not in ('png', 'jpg', 'jpeg', 'gif', 'bmp'):
            return HttpResponseNotFound('<h1>Invalid Image Type</h1>')

        image_data = open(file_path, "rb").read()
        return HttpResponse(image_data, content_type="image/%s" % file_type)
