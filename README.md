# drf-image-app
Basic drf app for uploading and labeling images

I found this useful for sorting and sending out wedding images to people.  It lets you upload images, add labels to them
which it can then filter on, and uses easy-thumbnail (which is useful).

Originally it was just using docker and serving everything, but I eventually decided to use nginx to server static files.

This project is a good example of:
* a REST API via django-rest-framework
* tied into postgres for production
* delivered via nginx
* using docker.
* using easy_thumbnail

I may later decide to write some sample tasks, or something useful to add in rabbit and celery to demonstrate.

The icons are from `material-design-icons`, so if you need more, you can install that bower component: fair warning though, it's huge.

If you want to run it in "production mode" you can run `docker-compose up`

