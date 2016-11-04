
FROM python:2.7

# Install anything we'll need
RUN apt-get update && apt-get install -y \
		gcc \
		gettext \
		sqlite3 \
		python-psycopg2 \
	--no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy the code into the docker container
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

# Ya know.
COPY requirements.txt /usr/src/app/
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

COPY ./start.sh /
ENTRYPOINT ["/start.sh"]
