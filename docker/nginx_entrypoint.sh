#!/bin/sh
set -e

: "${CLIENT_MAX_BODY_SIZE:=50M}"
: "${API_UPSTREAM:=http://backend:4000}"

# substitute only expected variables
if [ -f /etc/nginx/conf.d/default.conf.template ]; then
  envsubst '\$API_UPSTREAM \$CLIENT_MAX_BODY_SIZE' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'