FROM nginx:mainline-alpine

COPY src/data/ /var/www/html/data/
