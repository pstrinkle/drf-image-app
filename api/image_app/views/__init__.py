from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.generic.base import TemplateView
from django.views.generic import View
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseNotFound
from django.conf import settings
from django.template.exceptions import TemplateDoesNotExist
from django.http import Http404

from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.views import APIView

from image_app.models import Image
from image_app.serializers import LoginUserSerializer
import sys
import os


# My template and image viewer.
class IndexView(TemplateView):
    template_name = 'index.html'

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        request_path = request.path[1:]
        if len(request_path) == 0:
            request_path = 'index.html'

        try:
            return render(request, request_path, {})
        except TemplateDoesNotExist:
            raise Http404('404 Not Found')


class ImageView(View):
    """
    Because the /media/ isn't working...
    """

    def get(self, request, *args, **kwargs):
        request_path = request.path.replace(settings.MEDIA_URL, '')
        file_type = request_path.split('.')[-1].lower()
        file_path = os.path.join(settings.MEDIA_ROOT, request_path)

        if file_type not in ('png', 'jpg', 'jpeg', 'gif', 'bmp'):
            return HttpResponseNotFound('<h1>Invalid Image Type</h1>')

        image_data = open(file_path, "rb").read()
        return HttpResponse(image_data, content_type="image/%s" % file_type)


# I'm not 100% on the below, because I don't want to store their username/password in localstorage.
# ... so I might need to write an API that logs you in both ways.
#
# http://stackoverflow.com/questions/25223554/django-rest-framework-sessionid-and-csrftoken-arent-set-on-chrome
class AuthenticateView(APIView):
    """
    Based on the received session token, we will check if the session is still valid, meaning that we will check if the
    user is authenticated. If the request gets to be processed, means that the session token is still valid, otherwise
    we will issue an 401 status. If the session is valid, then return the user data.
    """

    permission_classes = (IsAuthenticated,)
    serializer_class = LoginUserSerializer
    queryset = Image.objects.all()

    def get(self, request, *args, **kwargs):
        return HttpResponse(self.serializer_class(request.user).data)


class LogoutView(APIView):
    """
    Will simply care to logout the user which was logged in. Will use the default behavior form Django, which doesn't
    require that the uses is logged in.
    """

    serializer_class = LoginUserSerializer
    queryset = Image.objects.all()

    @method_decorator(csrf_exempt)
    def post(self, request, *args, **kwargs):
        logout(request)
        return HttpResponse(status=status.HTTP_200_OK)
