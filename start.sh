#!/bin/bash

pushd api
python manage.py migrate                  # Apply database migrations
python manage.py collectstatic --noinput  # Collect static files

# Prepare log files and start outputting logs to stdout
touch /tmp/gunicorn.log
touch /tmp/access.log
tail -n 0 -f /tmp/*.log &

# Start Gunicorn processes
echo Starting Gunicorn.
exec gunicorn wsgi:application \
    --name api_django \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --log-level=info \
    --log-file=/tmp/gunicorn.log \
    --access-logfile=/tmp/access.log \
    "$@"

