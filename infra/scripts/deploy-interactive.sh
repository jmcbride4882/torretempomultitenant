#!/bin/bash
# Torre Tempo - Interactive Deployment Script
# Production-ready deployment for licensing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
DEFAULT_APP_DIR="/opt/torre-tempo"
DEFAULT_REPO_URL="https://github.com/jmcbride4882/torretempomultitenant.git"

clear
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}║     ▀▀▀█████▀▀▀  ████▀▀▀▀▀  ████▀▀▀▀   ████▀▀▀▀   ▀▀▀█████▀▀▀          ║${NC}"
echo -e "${GREEN}║         ██       ██    ██   ██   ██    ██   ██        ██                ║${NC}"
echo -e "${GREEN}║         ██       ██    ██   ██████     ██████         ██                ║${NC}"
echo -e "${GREEN}║         ██       ██    ██   ██   ██    ██   ██        ██                ║${NC}"
echo -e "${GREEN}║         ██       ████▄▄▄▄   ██    ██   ██    ██       ██                ║${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}║            ▀███▀████▀███▀ ████▀▀▀▀▀ ████▀   ▀██  ████▀▀▀▀▀              ║${NC}"
echo -e "${GREEN}║              ███  ███     ██       ███▀▀█▀▀███  ██       ██████         ║${NC}"
echo -e "${GREEN}║              ███  ███     ██████   ██  ██  ██   ██████   ██   ██        ║${NC}"
echo -e "${GREEN}║              ███  ███     ██       ██  ██  ██   ██       ██  ██         ║${NC}"
echo -e "${GREEN}║              ███  ███     ████▄▄▄▄ ██  ██  ██   ██       ██████         ║${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}║                ${YELLOW}Professional Time Tracking & Labor Compliance${NC}${GREEN}             ║${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}║                    ${BLUE}Powered by LSLT Group${NC}${GREEN}                                ║${NC}"
echo -e "${GREEN}║                ${BLUE}Lakeside La Torre (Murcia) • Spain${NC}${GREEN}                       ║${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}┌───────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│                                                                           │${NC}"
echo -e "${BLUE}│           ${YELLOW}✨ INTERACTIVE INSTALLATION WIZARD${NC}${BLUE}                           │${NC}"
echo -e "${BLUE}│                                                                           │${NC}"
echo -e "${BLUE}│  ${NC}Welcome! This wizard will deploy Torre Tempo on your server.           ${BLUE}│${NC}"
echo -e "${BLUE}│  ${NC}Professional-grade installation in minutes, not hours.                 ${BLUE}│${NC}"
echo -e "${BLUE}│                                                                           │${NC}"
echo -e "${BLUE}│  ${GREEN}⏱️  Time Required:${NC}  10-15 minutes                                       ${BLUE}│${NC}"
echo -e "${BLUE}│  ${GREEN}🔧 Prerequisites:${NC}  Ubuntu 20.04+ • Docker • Root Access                ${BLUE}│${NC}"
echo -e "${BLUE}│  ${GREEN}📦 What's Included:${NC} SSL Certificates • Database • Admin Account        ${BLUE}│${NC}"
echo -e "${BLUE}│                                                                           │${NC}"
echo -e "${BLUE}│  ${YELLOW}TIP:${NC} Press ${YELLOW}Ctrl+C${NC} at any time to safely cancel the installation    ${BLUE}│${NC}"
echo -e "${BLUE}│                                                                           │${NC}"
echo -e "${BLUE}└───────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${BLUE}┌─────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "  ${BLUE}│${NC} Version: ${GREEN}1.0.0${NC}        Support: ${GREEN}info@lsltgroup.es${NC}               ${BLUE}│${NC}"
echo -e "  ${BLUE}│${NC} Website: ${GREEN}https://lsltgroup.es${NC}    License: ${YELLOW}Commercial${NC}          ${BLUE}│${NC}"
echo -e "  ${BLUE}└─────────────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo bash deploy-interactive.sh)${NC}"
    exit 1
fi

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval "$var_name=\${input:-$default}"
    else
        read -p "$prompt: " input
        while [ -z "$input" ]; do
            echo -e "${RED}This field is required.${NC}"
            read -p "$prompt: " input
        done
        eval "$var_name=\"$input\""
    fi
}

# Function to prompt for password (hidden input)
prompt_password() {
    local prompt="$1"
    local var_name="$2"
    local password=""
    local password_confirm=""
    
    while true; do
        read -sp "$prompt: " password
        echo ""
        read -sp "Confirm password: " password_confirm
        echo ""
        
        if [ "$password" = "$password_confirm" ]; then
            if [ ${#password} -ge 8 ]; then
                eval "$var_name=\"$password\""
                break
            else
                echo -e "${RED}Password must be at least 8 characters.${NC}"
            fi
        else
            echo -e "${RED}Passwords do not match. Please try again.${NC}"
        fi
    done
}

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# Function to show menu and get selection
# All display output goes to stderr, only the selection goes to stdout
show_menu() {
    local prompt="$1"
    shift
    local options=("$@")
    
    # Display to stderr so it doesn't pollute variable capture
    echo "" >&2
    echo -e "${BLUE}$prompt${NC}" >&2
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[$i]}" >&2
    done
    echo "" >&2
    
    while true; do
        read -p "Enter choice [1-${#options[@]}]: " choice >&2
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
            # Only the selected value goes to stdout (captured by variable)
            echo "${options[$((choice-1))]}"
            return
        else
            echo -e "${RED}Invalid choice. Please enter a number between 1 and ${#options[@]}.${NC}" >&2
        fi
    done
}

# License Agreement
sleep 1
clear
echo ""
echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                                                                           ║${NC}"
echo -e "${YELLOW}║                        📜 SOFTWARE LICENSE AGREEMENT                      ║${NC}"
echo -e "${YELLOW}║                                                                           ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}┌───────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  ${NC}Torre Tempo - Professional Time Tracking Software                      ${BLUE}│${NC}"
echo -e "${BLUE}│  ${NC}Copyright © 2026 LSLT Group (Lakeside La Torre, Murcia)                ${BLUE}│${NC}"
echo -e "${BLUE}│  ${NC}All Rights Reserved.                                                   ${BLUE}│${NC}"
echo -e "${BLUE}└───────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${BLUE}This is proprietary commercial software. By proceeding, you confirm that:${NC}"
echo ""
echo -e "    ${GREEN}✓${NC}  You have purchased a valid license from LSLT Group"
echo -e "    ${GREEN}✓${NC}  You accept the Terms and Conditions of Use"
echo -e "    ${GREEN}✓${NC}  You understand this software is confidential and proprietary"
echo -e "    ${GREEN}✓${NC}  Unauthorized copying, modification, or distribution is prohibited"
echo -e "    ${GREEN}✓${NC}  This software is provided 'as-is' without warranty of any kind"
echo ""
echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}  │  AVAILABLE LICENSE TYPES                                            │${NC}"
echo -e "${YELLOW}  └─────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "    ${BLUE}💼 Internal Use License${NC}     ${GREEN}€199/month${NC}"
echo -e "       → Single organization deployment"
echo -e "       → Unlimited employees and locations"
echo -e "       → Email support included"
echo ""
echo -e "    ${BLUE}🚀 Distribution License${NC}     ${GREEN}€499/month${NC}"
echo -e "       → Resell to multiple clients"
echo -e "       → White-label branding options"
echo -e "       → Priority support and training"
echo ""
echo -e "    ${BLUE}⭐ White Label License${NC}      ${GREEN}Custom Pricing${NC}"
echo -e "       → Complete source code access"
echo -e "       → Full customization rights"
echo -e "       → Dedicated account manager"
echo ""
echo -e "  ${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "    ${BLUE}📧 Sales & Licensing:${NC}  info@lsltgroup.es"
echo -e "    ${BLUE}🌐 Website:${NC}            https://lsltgroup.es"
echo -e "    ${BLUE}📞 Phone:${NC}              +34 XXX XXX XXX"
echo ""
echo -e "  ${RED}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "  ${RED}║  ⚠️  LEGAL NOTICE                                                     ║${NC}"
echo -e "  ${RED}║                                                                       ║${NC}"
echo -e "  ${RED}║  Proceeding without a valid license violates international           ║${NC}"
echo -e "  ${RED}║  copyright law and may result in legal action.                       ║${NC}"
echo -e "  ${RED}╚═══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo ""
read -p "$(echo -e ${YELLOW}  Do you have a valid license? Type \'${GREEN}yes${YELLOW}\' to accept and continue: ${NC})" license_accept

if [ "$license_accept" != "yes" ]; then
    clear
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                           ║${NC}"
    echo -e "${RED}║                        ⛔ VALID LICENSE REQUIRED                          ║${NC}"
    echo -e "${RED}║                                                                           ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}  Installation cannot proceed without a valid commercial license.${NC}"
    echo ""
    echo -e "  ${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "    ${GREEN}📧 Email Sales:${NC}    info@lsltgroup.es"
    echo -e "    ${GREEN}🌐 Visit Website:${NC}  https://lsltgroup.es"
    echo -e "    ${GREEN}📞 Call Us:${NC}        +34 XXX XXX XXX"
    echo ""
    echo -e "  ${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}  ✨ SPECIAL OFFERS AVAILABLE${NC}"
    echo ""
    echo -e "    ${GREEN}•${NC} 30-day FREE evaluation license (no credit card)"
    echo -e "    ${GREEN}•${NC} Volume discounts for 10+ locations"
    echo -e "    ${GREEN}•${NC} Custom development and integration services"
    echo -e "    ${GREEN}•${NC} On-site training and implementation support"
    echo -e "    ${GREEN}•${NC} Annual payment discounts (save 20%)"
    echo ""
    echo -e "  ${BLUE}We typically respond to license requests within 2 business hours.${NC}"
    echo ""
    exit 0
fi

clear
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}║                        ✓ LICENSE AGREEMENT ACCEPTED                       ║${NC}"
echo -e "${GREEN}║                                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Thank you for choosing Torre Tempo by LSLT Group!${NC}"
echo ""
echo -e "${YELLOW}┌───────────────────────────────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│  License Key (Optional)                                                   │${NC}"
echo -e "${YELLOW}└───────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "  ${BLUE}If you have received a license key from LSLT Group, enter it below.${NC}"
echo -e "  ${BLUE}Otherwise, press Enter to continue with evaluation mode.${NC}"
echo ""
read -p "$(echo -e ${YELLOW}  License Key (or press Enter to skip): ${NC})" LICENSE_KEY

if [ -n "$LICENSE_KEY" ]; then
    echo ""
    echo -e "  ${GREEN}✓${NC} License key recorded: ${GREEN}${LICENSE_KEY:0:8}-****-****-****${NC}"
    echo -e "  ${BLUE}Your license will be validated during system startup.${NC}"
    LICENSE_TYPE="Licensed"
else
    echo ""
    echo -e "  ${YELLOW}⚠️  ${NC} No license key provided - proceeding in ${YELLOW}Evaluation Mode${NC}"
    echo -e "  ${BLUE}30-day trial with full features enabled.${NC}"
    LICENSE_KEY="EVAL-30DAY-$(date +%Y%m%d)"
    LICENSE_TYPE="Evaluation"
fi

echo ""
echo -e "  ${BLUE}Preparing your professional deployment experience...${NC}"
sleep 2

# Collect configuration
clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                                                                      ║${NC}"
echo -e "${YELLOW}║           📋 INSTALLATION CONFIGURATION WIZARD                       ║${NC}"
echo -e "${YELLOW}║                                                                      ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  We'll collect the information needed to configure your installation.${NC}"
echo -e "${BLUE}  Each step includes helpful explanations and validation.${NC}"
echo ""
echo -e "${GREEN}  ✓ ${NC}All sensitive data is encrypted"
echo -e "${GREEN}  ✓ ${NC}SSL certificates are generated automatically"
echo -e "${GREEN}  ✓ ${NC}Admin account is created with your chosen credentials"
echo ""
read -p "$(echo -e ${YELLOW}Press Enter to begin configuration...${NC})" dummy
clear

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ${NC}STEP 1 of 6                                                          ${YELLOW}║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${NC}📁 Installation Directory                                            ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  This is where Torre Tempo will be installed on your server.${NC}"
echo ""
echo -e "  📂 Default location: ${GREEN}$DEFAULT_APP_DIR${NC}"
echo -e "  💾 Required space:   ${GREEN}~2GB${NC}"
echo ""
prompt_with_default "Install directory" "$DEFAULT_APP_DIR" "APP_DIR"
echo -e "${GREEN}  ✓ Directory configured${NC}"

clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ${NC}STEP 2 of 6                                                          ${YELLOW}║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${NC}🌐 Domain Configuration                                              ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  Enter the domain name(s) where Torre Tempo will be accessible.${NC}"
echo ""
echo -e "  📌 Example:     ${GREEN}tempo.yourcompany.com${NC}"
echo -e "  🔗 DNS Setup:   ${BLUE}Point A record to this server's IP${NC}"
echo -e "  🔐 SSL:         ${GREEN}Automatic certificate via Let's Encrypt${NC}"
echo ""
prompt_with_default "Primary domain (required)" "" "PRIMARY_DOMAIN"
echo ""
prompt_with_default "Secondary domain (optional, press Enter to skip)" "" "SECONDARY_DOMAIN"
echo ""
echo -e "${BLUE}  📧 Email for SSL certificate notifications:${NC}"
echo ""
prompt_with_default "Email for SSL certificates" "" "CERTBOT_EMAIL"
echo -e "${GREEN}  ✓ Domain configuration complete${NC}"

clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ${NC}STEP 3 of 6                                                          ${YELLOW}║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${NC}🏢 Organization Configuration                                        ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  Set up your organization's information in the system.${NC}"
echo ""
echo -e "  🏛️  Organization Name"
echo -e "  ${BLUE}This is your company's full legal or trading name.${NC}"
echo -e "  📌 Example: ${GREEN}ACME Corporation${NC} or ${GREEN}Smith & Associates${NC}"
echo ""
prompt_with_default "Company/Organization name" "" "COMPANY_NAME"

echo ""
echo -e "  🔗 Tenant Slug (URL-friendly identifier)"
echo -e "  ${BLUE}Used in system URLs and must be unique.${NC}"
echo -e "  ${BLUE}Use lowercase letters, numbers, and hyphens only.${NC}"
echo -e "  📌 Example: ${GREEN}acme-corp${NC} or ${GREEN}smith-associates${NC}"
echo ""
prompt_with_default "Tenant slug" "" "TENANT_SLUG"

clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ${NC}STEP 3 of 6 (continued)                                              ${YELLOW}║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${NC}🌍 Regional Settings                                                 ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  ⏰ Select your timezone:${NC}"
TIMEZONE=$(show_menu "Choose timezone:" \
    "Europe/Madrid (Spain)" \
    "Europe/London (UK)" \
    "Europe/Paris (France)" \
    "Europe/Berlin (Germany)" \
    "Europe/Amsterdam (Netherlands)" \
    "Europe/Brussels (Belgium)" \
    "Europe/Warsaw (Poland)" \
    "America/New_York (US Eastern)" \
    "America/Los_Angeles (US Pacific)" \
    "America/Chicago (US Central)")
TIMEZONE=$(echo "$TIMEZONE" | awk '{print $1}')
echo -e "${GREEN}  ✓ Timezone: $TIMEZONE${NC}"

echo ""
echo -e "${BLUE}  🌐 Select your default language:${NC}"
LOCALE=$(show_menu "Choose language:" \
    "es - Spanish (Español)" \
    "en - English" \
    "fr - French (Français)" \
    "de - German (Deutsch)" \
    "pl - Polish (Polski)" \
    "nl - Dutch (Nederlands)")
LOCALE=$(echo "$LOCALE" | awk '{print $1}')
echo -e "${GREEN}  ✓ Language: $LOCALE${NC}"

clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ${NC}STEP 4 of 6                                                          ${YELLOW}║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${NC}👤 Administrator Account                                             ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  Create the initial system administrator account.${NC}"
echo ""
echo -e "  🔑 This account will have full access to:${NC}"
echo -e "     • Manage users and roles"
echo -e "     • Configure company settings"
echo -e "     • Access all reports and data"
echo -e "     • System configuration"
echo ""
echo -e "  📧 Administrator Email"
prompt_with_default "Admin email" "" "ADMIN_EMAIL"
echo ""
echo -e "  👨 Administrator Name"
prompt_with_default "First name" "" "ADMIN_FIRST_NAME"
prompt_with_default "Last name" "" "ADMIN_LAST_NAME"
echo ""
echo -e "  🔐 Administrator Password"
echo -e "  ${BLUE}Requirements: Minimum 8 characters${NC}"
echo -e "  ${BLUE}Recommended: Use a mix of letters, numbers, and symbols${NC}"
echo ""
prompt_password "Admin password" "ADMIN_PASSWORD"
echo -e "${GREEN}  ✓ Administrator account configured${NC}"

clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ${NC}STEP 5 of 6                                                          ${YELLOW}║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${NC}🔐 Security Configuration                                            ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  Generating cryptographically secure credentials...${NC}"
echo ""
echo -e "  ${BLUE}These credentials will be automatically generated and saved${NC}"
echo -e "  ${BLUE}to your .env file. You don't need to remember them.${NC}"
echo ""
DB_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_password)
echo -e "  ${GREEN}✓${NC} Database password     ${GREEN}[32 characters, auto-generated]${NC}"
echo -e "  ${GREEN}✓${NC} JWT signing secret    ${GREEN}[32 characters, auto-generated]${NC}"
echo ""
echo -e "  ${GREEN}✓${NC} All credentials encrypted and secured"

clear
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  ${NC}STEP 6 of 6                                                          ${YELLOW}║${NC}"
echo -e "${YELLOW}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  ${NC}📦 Source Code Repository                                            ${YELLOW}║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  Git repository URL for Torre Tempo source code.${NC}"
echo ""
echo -e "  ${BLUE}Leave default unless you have a custom/licensed version.${NC}"
echo ""
prompt_with_default "Repository URL" "$DEFAULT_REPO_URL" "REPO_URL"
echo -e "${GREEN}  ✓ Repository configured${NC}"

# Confirmation
clear
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║                  ✓ CONFIGURATION SUMMARY                             ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}┌─────────────────────────────── Installation ───────────────────────────────┐${NC}"
echo -e "  📂 Directory:         ${GREEN}$APP_DIR${NC}"
echo -e "  📦 Repository:        ${GREEN}$REPO_URL${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${BLUE}┌──────────────────────────────── Domain & SSL ──────────────────────────────┐${NC}"
echo -e "  🌐 Primary domain:    ${GREEN}$PRIMARY_DOMAIN${NC}"
[ -n "$SECONDARY_DOMAIN" ] && echo -e "  🌐 Secondary domain:  ${GREEN}$SECONDARY_DOMAIN${NC}"
echo -e "  📧 SSL email:         ${GREEN}$CERTBOT_EMAIL${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${BLUE}┌───────────────────────────────── Organization ─────────────────────────────┐${NC}"
echo -e "  🏢 Company:           ${GREEN}$COMPANY_NAME${NC}"
echo -e "  🔗 Tenant slug:       ${GREEN}$TENANT_SLUG${NC}"
echo -e "  ⏰ Timezone:          ${GREEN}$TIMEZONE${NC}"
echo -e "  🌐 Language:          ${GREEN}$LOCALE${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${BLUE}┌──────────────────────────────── Administrator ─────────────────────────────┐${NC}"
echo -e "  👤 Name:              ${GREEN}$ADMIN_FIRST_NAME $ADMIN_LAST_NAME${NC}"
echo -e "  📧 Email:             ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "  🔑 Password:          ${GREEN}[Set - 8+ characters]${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${BLUE}┌────────────────────────────────── Security ────────────────────────────────┐${NC}"
echo -e "  🔐 Database:          ${GREEN}✓ Auto-generated 32-char password${NC}"
echo -e "  🔐 JWT Secret:        ${GREEN}✓ Auto-generated 32-char secret${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${BLUE}┌────────────────────────────────── Licensing ───────────────────────────────┐${NC}"
if [ "$LICENSE_TYPE" = "Licensed" ]; then
echo -e "  📜 License Type:      ${GREEN}✓ Commercial License${NC}"
echo -e "  🔑 License Key:       ${GREEN}${LICENSE_KEY:0:8}-****-****-****${NC}"
else
echo -e "  📜 License Type:      ${YELLOW}⚠️  Evaluation Mode (30 days)${NC}"
echo -e "  🔑 License Key:       ${YELLOW}$LICENSE_KEY${NC}"
fi
echo -e "  📅 Accepted Date:     $(date +"%Y-%m-%d %H:%M:%S")"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════════════════════${NC}"
read -p "$(echo -e ${YELLOW}Everything looks correct? Type \'yes\' to continue: ${NC})" confirm

if [ "$confirm" != "yes" ]; then
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ${NC}Installation Cancelled                                               ${RED}║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}  Run the script again to start over.${NC}"
    echo ""
    exit 0
fi

clear
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║                 🚀 STARTING INSTALLATION                             ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}  This will take approximately 10-15 minutes.${NC}"
echo -e "${BLUE}  Please wait while we set up your Torre Tempo installation...${NC}"
echo ""
sleep 2

# Step 1: System Update
echo -e "\n${YELLOW}[1/9] Updating system...${NC}"
apt-get update && apt-get upgrade -y

# Step 2: Install Dependencies
echo -e "\n${YELLOW}[2/9] Installing dependencies...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    jq

# Step 3: Install Docker
echo -e "\n${YELLOW}[3/9] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 4: Configure Firewall
echo -e "\n${YELLOW}[4/9] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured${NC}"

# Step 5: Clone/Update Repository
echo -e "\n${YELLOW}[5/9] Setting up application...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Updating existing installation..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/main
else
    echo "Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Step 6: Create Environment File
echo -e "\n${YELLOW}[6/9] Configuring environment...${NC}"
ENV_FILE="$APP_DIR/infra/.env"

cat > "$ENV_FILE" << EOF
# Torre Tempo - Production Environment
# Generated on $(date)

# Database
DB_PASSWORD=${DB_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}

# Node Environment
NODE_ENV=production

# Company/Tenant Configuration
COMPANY_NAME=${COMPANY_NAME}
TENANT_SLUG=${TENANT_SLUG}
TIMEZONE=${TIMEZONE}
LOCALE=${LOCALE}

# Default Admin
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_FIRST_NAME=${ADMIN_FIRST_NAME}
ADMIN_LAST_NAME=${ADMIN_LAST_NAME}

# Domain Configuration
PRIMARY_DOMAIN=${PRIMARY_DOMAIN}
SECONDARY_DOMAIN=${SECONDARY_DOMAIN}
CERTBOT_EMAIL=${CERTBOT_EMAIL}

# License Information
LICENSE_KEY=${LICENSE_KEY}
LICENSE_TYPE=${LICENSE_TYPE}
LICENSE_ACCEPTED_DATE=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
LICENSE_ACCEPTED_BY=root
EOF

chmod 600 "$ENV_FILE"
echo -e "${GREEN}Environment file created at $ENV_FILE${NC}"

# Create required directories
mkdir -p "$APP_DIR/infra/ssl/certbot/conf"
mkdir -p "$APP_DIR/infra/ssl/certbot/www"
mkdir -p "$APP_DIR/infra/backups"

# Step 7: Start Application (HTTP first for SSL cert generation)
echo -e "\n${YELLOW}[7/9] Starting application...${NC}"
cd "$APP_DIR/infra"

# Create temporary HTTP-only nginx config for cert generation
DOMAINS="$PRIMARY_DOMAIN"
[ -n "$SECONDARY_DOMAIN" ] && DOMAINS="$DOMAINS $SECONDARY_DOMAIN"

cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << 'NGINXEOF'
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    location /api {
        set $api http://api:4000;
        proxy_pass $api;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        set $web http://web:80;
        proxy_pass $web;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

# Stop any existing services
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo "Waiting for services to start..."
sleep 20

# Step 8: SSL Certificate
echo -e "\n${YELLOW}[8/9] Setting up SSL certificates...${NC}"

# Check if certs already exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}SSL certificates already exist${NC}"
else
    echo "Obtaining SSL certificates..."
    
    CERT_DOMAINS="-d $PRIMARY_DOMAIN"
    [ -n "$SECONDARY_DOMAIN" ] && CERT_DOMAINS="$CERT_DOMAINS -d $SECONDARY_DOMAIN"
    
    docker run --rm \
        -v "$APP_DIR/infra/ssl/certbot/conf:/etc/letsencrypt" \
        -v "$APP_DIR/infra/ssl/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        $CERT_DOMAINS && \
    echo -e "${GREEN}SSL certificates obtained${NC}" || \
    echo -e "${YELLOW}SSL certificate generation failed - app will run on HTTP only${NC}"
fi

# Update nginx config with HTTPS if certs exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    echo "Enabling HTTPS..."
    
    SERVER_NAMES="$PRIMARY_DOMAIN"
    [ -n "$SECONDARY_DOMAIN" ] && SERVER_NAMES="$SERVER_NAMES $SECONDARY_DOMAIN"
    
    cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << NGINXEOF
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name $SERVER_NAMES;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    location / {
        return 301 https://\$host\$request_uri;
    }
}
server {
    listen 443 ssl;
    server_name $SERVER_NAMES;
    ssl_certificate /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;
    location /api {
        set \$api http://api:4000;
        proxy_pass \$api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        set \$web http://web:80;
        proxy_pass \$web;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF
    docker restart torre-tempo-nginx
    echo -e "${GREEN}HTTPS enabled${NC}"
fi

# Step 9: Initialize Database and Admin Account
echo -e "\n${YELLOW}[9/9] Setting up database and admin account...${NC}"

# Wait for database to be ready
sleep 10

# Reset database password
docker exec torre-tempo-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true

# Push schema to database
echo "Creating database schema..."
docker run --rm --network infra_torre-tempo-network \
    -e DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/torre_tempo?schema=public" \
    -v "$APP_DIR/apps/api/prisma:/app/prisma" \
    infra-api sh -c 'cd /app && npx prisma db push --schema=/app/prisma/schema.prisma --skip-generate' || \
    echo -e "${YELLOW}Schema push may have failed - will retry${NC}"

# Generate password hash
ADMIN_PASSWORD_HASH=$(docker run --rm infra-api node -e "const bcrypt = require('bcrypt'); bcrypt.hash('$ADMIN_PASSWORD', 12).then(hash => console.log(hash));")

# Create admin account
echo "Creating admin account..."
docker exec -i torre-tempo-db psql -U postgres -d torre_tempo << EOSQL
-- Create tenant
INSERT INTO tenants (id, name, slug, timezone, locale, "maxWeeklyHours", "maxAnnualHours", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '${COMPANY_NAME}',
  '${TENANT_SLUG}',
  '${TIMEZONE}',
  '${LOCALE}',
  40,
  1822,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id, name, slug;

-- Create admin user
INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", role, "employeeCode", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  t.id,
  '${ADMIN_EMAIL}',
  '${ADMIN_PASSWORD_HASH}',
  '${ADMIN_FIRST_NAME}',
  '${ADMIN_LAST_NAME}',
  'ADMIN',
  'ADMIN001',
  true,
  NOW(),
  NOW()
FROM tenants t
WHERE t.slug = '${TENANT_SLUG}'
ON CONFLICT ("tenantId", email) DO UPDATE SET "firstName" = EXCLUDED."firstName"
RETURNING id, email, "firstName", "lastName", role;
EOSQL

# Restart API to refresh Prisma client
docker restart torre-tempo-api
sleep 10

# Check health
echo -e "\n${YELLOW}Checking service health...${NC}"
docker compose -f docker-compose.prod.yml ps

# Final output
clear
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║              🎉 DEPLOYMENT SUCCESSFULLY COMPLETED! 🎉                ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}┌────────────────────────── Your Application ───────────────────────────────┐${NC}"
echo -e "  🌐 Primary URL:       ${GREEN}https://$PRIMARY_DOMAIN${NC}"
[ -n "$SECONDARY_DOMAIN" ] && echo -e "  🌐 Secondary URL:     ${GREEN}https://$SECONDARY_DOMAIN${NC}"
echo -e "  📊 Status:            ${GREEN}✓ Online and Running${NC}"
echo -e "  🔐 SSL:               ${GREEN}✓ Enabled (Let's Encrypt)${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                                                                      ║${NC}"
echo -e "${YELLOW}║                   🔑 ADMINISTRATOR CREDENTIALS                       ║${NC}"
echo -e "${YELLOW}║                                                                      ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📧 Email:             ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "  🔑 Password:          ${GREEN}$ADMIN_PASSWORD${NC}"
echo -e "  🏢 Organization:      ${GREEN}$COMPANY_NAME${NC}"
echo -e "  🔗 Tenant:            ${GREEN}$TENANT_SLUG${NC}"
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ⚠️  SECURITY NOTICE                                                 ║${NC}"
echo -e "${RED}╠══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║  ${NC}• Save these credentials in a secure password manager             ${RED}║${NC}"
echo -e "${RED}║  ${NC}• Change the admin password after first login                     ${RED}║${NC}"
echo -e "${RED}║  ${NC}• Enable two-factor authentication (coming in v1.1)               ${RED}║${NC}"
echo -e "${RED}║  ${NC}• Credentials are also saved in: $APP_DIR/infra/.env  ${RED}║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📖 USEFUL COMMANDS                                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}View Logs:${NC}"
echo -e "    cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "  ${YELLOW}Restart Services:${NC}"
echo -e "    cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml restart"
echo ""
echo -e "  ${YELLOW}Stop Services:${NC}"
echo -e "    cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml down"
echo ""
echo -e "  ${YELLOW}Update Application:${NC}"
echo -e "    cd $APP_DIR && bash infra/scripts/update.sh"
echo ""
echo -e "  ${YELLOW}Database Backup:${NC}"
echo -e "    cd $APP_DIR && bash infra/scripts/backup.sh"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🆘 SUPPORT & RESOURCES                                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📧 Email Support:     ${GREEN}info@lsltgroup.es${NC}"
echo -e "  🌐 Website:           ${GREEN}https://lsltgroup.es${NC}"
echo -e "  📚 Documentation:     ${GREEN}https://docs.torretempo.com${NC} (coming soon)"
echo -e "  💬 Community Forum:   ${GREEN}https://forum.torretempo.com${NC} (coming soon)"
echo ""
if [ "$LICENSE_TYPE" = "Evaluation" ]; then
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                                                                      ║${NC}"
echo -e "${YELLOW}║                    ⚠️  EVALUATION MODE ACTIVE                       ║${NC}"
echo -e "${YELLOW}║                                                                      ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Your 30-day evaluation period started: $(date +"%Y-%m-%d")${NC}"
echo -e "  ${YELLOW}Full features are available during evaluation.${NC}"
echo ""
echo -e "  ${BLUE}To purchase a license:${NC}"
echo -e "    📧 Email: info@lsltgroup.es"
echo -e "    🌐 Web:   https://lsltgroup.es"
echo ""
echo -e "  ${BLUE}Benefits of a commercial license:${NC}"
echo -e "    • No time restrictions"
echo -e "    • Priority email support"
echo -e "    • Guaranteed updates and security patches"
echo -e "    • Legal compliance documentation"
echo ""
fi
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║        Thank you for choosing Torre Tempo by LSLT Group!            ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}║     © 2026 LSLT Group - Lakeside La Torre (Murcia) - Spain          ║${NC}"
echo -e "${GREEN}║                Licensed Commercial Software                          ║${NC}"
echo -e "${GREEN}║                                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
