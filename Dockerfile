FROM nginx:mainline-alpine

COPY src/ /var/www/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
