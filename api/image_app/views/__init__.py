from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic.base import TemplateView
from django.utils.decorators import method_decorator
from django.shortcuts import render


class IndexView(TemplateView):
    template_name = 'index.html'

    #@method_decorator(ensure_csrf_cookie)
    #def dispatch(self, *args, **kwargs):
    #    return super(IndexView, self).dispatch(*args, **kwargs)

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        request_path = request.path[1:]
        if len(request_path) == 0:
            request_path = 'index.html'

        return render(request, request_path, {})
