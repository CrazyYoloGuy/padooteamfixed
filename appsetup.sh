#!/bin/bash

# PadooDelivery App Setup Script
# This script sets up nginx, domain, SSL, and PM2 for your delivery app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get user input
echo -e "${BLUE}=== PadooDelivery App Setup ===${NC}"
echo ""

# Get domain name
read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    print_error "Domain name is required!"
    exit 1
fi

# Get app directory
read -p "Enter full path to your app directory (e.g., /home/user/padoodelivery): " APP_DIR
if [ -z "$APP_DIR" ]; then
    print_error "App directory is required!"
    exit 1
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    print_error "App directory does not exist: $APP_DIR"
    exit 1
fi

# Check if server.js exists
if [ ! -f "$APP_DIR/server.js" ]; then
    print_error "server.js not found in $APP_DIR"
    exit 1
fi

# Ask about SSL
read -p "Do you want to set up SSL certificate with Let's Encrypt? (y/n): " SETUP_SSL
SETUP_SSL=${SETUP_SSL,,} # Convert to lowercase

print_status "Starting setup with domain: $DOMAIN_NAME"
print_status "App directory: $APP_DIR"

# 1. Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# 2. Install Node.js if not present
if ! command_exists node; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed"
else
    print_success "Node.js already installed ($(node --version))"
fi

# 3. Install PM2 globally
if ! command_exists pm2; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# 4. Install nginx
if ! command_exists nginx; then
    print_status "Installing nginx..."
    sudo apt install nginx -y
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# 5. Start and enable nginx
print_status "Starting and enabling nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx
print_success "Nginx started and enabled"

# 6. Configure firewall
print_status "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
print_success "Firewall configured"

# 7. Install app dependencies
print_status "Installing app dependencies..."
cd "$APP_DIR"
npm install
print_success "Dependencies installed"

# 8. Stop existing PM2 process if running
print_status "Checking for existing PM2 processes..."
if pm2 list | grep -q "padoo-delivery"; then
    print_warning "Stopping existing padoo-delivery process..."
    pm2 stop padoo-delivery
    pm2 delete padoo-delivery
fi

# 9. Start app with PM2
print_status "Starting app with PM2..."
pm2 start server.js --name "padoo-delivery"
pm2 save
print_success "App started with PM2"

# 10. Set up PM2 startup
print_status "Setting up PM2 startup..."
STARTUP_CMD=$(pm2 startup | tail -n 1)
if [[ $STARTUP_CMD == sudo* ]]; then
    print_status "Executing PM2 startup command..."
    eval $STARTUP_CMD
    print_success "PM2 startup configured"
fi

# 11. Remove default nginx site
print_status "Removing default nginx site..."
sudo rm -f /etc/nginx/sites-enabled/default
print_success "Default site removed"

# 12. Create nginx configuration
print_status "Creating nginx configuration for $DOMAIN_NAME..."
sudo tee /etc/nginx/sites-available/$DOMAIN_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeout for long requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 13. Enable the site
print_status "Enabling nginx site..."
sudo ln -s /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/
print_success "Site enabled"

# 14. Test nginx configuration
print_status "Testing nginx configuration..."
if sudo nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

# 15. Restart nginx
print_status "Restarting nginx..."
sudo systemctl restart nginx
print_success "Nginx restarted"

# 16. Set up SSL if requested
if [ "$SETUP_SSL" = "y" ]; then
    print_status "Setting up SSL certificate..."
    
    # Install certbot
    if ! command_exists certbot; then
        sudo apt install certbot python3-certbot-nginx -y
    fi
    
    # Get SSL certificate
    print_status "Obtaining SSL certificate for $DOMAIN_NAME..."
    if sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME; then
        print_success "SSL certificate obtained and configured"
        
        # Test auto-renewal
        print_status "Testing SSL auto-renewal..."
        sudo certbot renew --dry-run
        print_success "SSL auto-renewal test passed"
    else
        print_warning "SSL setup failed. You can set it up manually later with: sudo certbot --nginx -d $DOMAIN_NAME"
    fi
fi

# 17. Final status checks
print_status "Performing final checks..."

# Check PM2 status
echo ""
print_status "PM2 Status:"
pm2 status

# Check nginx status
echo ""
print_status "Nginx Status:"
sudo systemctl status nginx --no-pager -l

# Check if port 3000 is listening
echo ""
print_status "Port 3000 Status:"
if sudo netstat -tlnp | grep :3000; then
    print_success "App is listening on port 3000"
else
    print_warning "App might not be listening on port 3000"
fi

# Final success message
echo ""
echo -e "${GREEN}=== SETUP COMPLETE ===${NC}"
echo ""
print_success "Your PadooDelivery app is now set up!"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Make sure your DNS A records point to this server's IP:"
echo "   - $DOMAIN_NAME -> $(curl -s ifconfig.me)"
echo "   - www.$DOMAIN_NAME -> $(curl -s ifconfig.me)"
echo ""
echo "2. Your app should be accessible at:"
if [ "$SETUP_SSL" = "y" ]; then
    echo "   - https://$DOMAIN_NAME"
    echo "   - https://www.$DOMAIN_NAME"
else
    echo "   - http://$DOMAIN_NAME"
    echo "   - http://www.$DOMAIN_NAME"
fi
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "- View app logs: pm2 logs padoo-delivery"
echo "- Restart app: pm2 restart padoo-delivery"
echo "- Monitor app: pm2 monit"
echo "- Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
print_warning "Don't forget to configure your .env file with Supabase credentials!"

# Create a simple status check script
print_status "Creating status check script..."
sudo tee /usr/local/bin/padoo-status > /dev/null <<'EOF'
#!/bin/bash
echo "=== PadooDelivery Status ==="
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager -l
echo ""
echo "Port 3000:"
netstat -tlnp | grep :3000
echo ""
echo "Recent App Logs:"
pm2 logs padoo-delivery --lines 10
EOF

sudo chmod +x /usr/local/bin/padoo-status
print_success "Status check script created at /usr/local/bin/padoo-status"

echo ""
print_success "Run 'padoo-status' anytime to check your app status!"
