#!/bin/bash
# Initial VPS setup script for Torre Tempo
# Run this once on a fresh Ubuntu 24.04 VPS

set -e

echo "🏗️  Setting up VPS for Torre Tempo..."
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js 20.x LTS
echo "📦 Installing Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js $(node --version) installed"
echo "✅ npm $(npm --version) installed"

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker $(docker --version) installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
if ! docker compose version &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install Git
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    apt-get install -y git
fi

# Install other useful tools
echo "📦 Installing utility tools..."
apt-get install -y curl wget unzip nano vim htop

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/torre-tempo
cd /opt/torre-tempo

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clone repository:"
echo "   cd /opt/torre-tempo"
echo "   git clone https://github.com/jmcbride4882/torretempomultitenant.git ."
echo ""
echo "2. Run interactive deployment:"
echo "   cd infra"
echo "   chmod +x scripts/deploy-interactive.sh"
echo "   ./scripts/deploy-interactive.sh"
echo ""
echo "Or use automated deployment:"
echo "   cd infra"
echo "   cp .env.example .env"
echo "   nano .env  # Edit configuration"
echo "   chmod +x scripts/deploy.sh"
echo "   ./scripts/deploy.sh"
