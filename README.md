# drf-image-app
Basic django-rest-framework app for uploading and labeling images.

I found this useful for sorting and sending out wedding images to people.  It lets you upload images, add labels to them
which it can then filter on, and uses easy-thumbnail (which is useful).

Effectively it's a basic single-page angular front-end that is rendered via django alongside the APIs to support it.

If you're new to django-rest-framework you might find this helpful as it utilizes custom pagination, filters, easy_thumbnail, and other facets of the platform.

It uses docker for postgres and django, however, you can run it directly without any issues.
