#!/bin/sh

# Generate runtime environment configuration
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV_CONFIG = {
  VITE_API_URL: '${VITE_API_URL:-/api}'
};
EOF

# Start nginx
exec nginx -g 'daemon off;'
