from django_filters import FilterSet, ModelMultipleChoiceFilter, MethodFilter
from django.apps import apps


class LabelsFilter(FilterSet):
    """
    A custom Finding filter to use the MultipleChoiceFilter for the labels field.
    Below, and in lots of places, I use the apps.get_model() just to save issues with things being initialized out of
    order, and I figured, to be consistent, I would just use it effectively everywhere.
    https://github.com/carltongibson/django-filter/issues/137
    http://django-filter.readthedocs.io/en/latest/ref/filters.html#modelchoicefilter-and-modelmultiplechoicefilter-arguments
    """

    # The filter will form the AND of the selected choices when the conjoined=True argument is passed to this class.

    # given a list of label values, allow selection.
    labels = ModelMultipleChoiceFilter(
        name='labels__value',
        to_field_name='value',
        queryset=apps.get_model('image_app.Label').objects.all(),
    )

    unlabeled = MethodFilter()

    def filter_unlabeled(self, queryset, value):
        """
        Return unlabeled only (typically, technically False by default but could be specified).
        """

        if value:
            return queryset.filter(labels=None)

        return queryset

    class Meta:
        model = apps.get_model('image_app.Image')
        fields = ['labels', 'unlabeled']
