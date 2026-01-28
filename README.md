# Torre Tempo

**Professional Staff Clocking System for Spanish Labor Law Compliance**

> **⚠️ PROPRIETARY COMMERCIAL SOFTWARE**  
> This software requires a **paid commercial license** for any use beyond evaluation.  
> **Unauthorized use, modification, or deployment is strictly prohibited.**  
> See [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE) for details.  
> **Contact info@lsltgroup.es to purchase a license.**

Multi-tenant Progressive Web App (PWA) for Spanish labor law compliant time tracking (registro horario), designed for hospitality, retail, and service industries.

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Commercial](https://img.shields.io/badge/license-Required-orange.svg)](NOTICE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)

---

## 🎯 Why Torre Tempo?

Torre Tempo solves the complex challenge of Spanish labor law compliance (RD-Ley 8/2019) while providing a modern, user-friendly experience for both employees and management.

**Perfect for:**
- 🏨 **Hospitality**: Hotels, restaurants, bars
- 🛍️ **Retail**: Shops, supermarkets, shopping centers
- 🏢 **Service Industries**: Offices, consulting, professional services
- 🏗️ **Construction**: Multiple work sites with location tracking
- 🚚 **Logistics**: Warehouses, delivery services

**Key Benefits:**
- ✅ **100% Legal Compliance**: RD-Ley 8/2019, GDPR, Convenio regulations
- ✅ **Zero Training Required**: Intuitive QR-code based system
- ✅ **Works Offline**: Employees can clock in even without internet
- ✅ **Multi-Location**: Track time across multiple work sites
- ✅ **Audit-Ready**: 5-year retention with signed reports
- ✅ **Mobile-First**: Works on any device, no app store needed

---

## ✨ Features

### Core Time Tracking

- **📱 QR + Geofence Clock-in**
  - Workers scan location-specific QR codes to clock in/out
  - GPS geofence validation ensures they're at the right location
  - Prevents buddy punching and time theft
  - Works on any smartphone or tablet

- **📡 Offline Support**
  - Progressive Web App (PWA) technology
  - Queues clock-ins when offline
  - Automatically syncs when connection is restored
  - No app store installation required

- **🏢 Multi-tenant Architecture**
  - Complete data isolation per organization
  - Unlimited locations per tenant
  - Role-based access control (Admin, Manager, Employee)
  - White-label ready for resellers

### Compliance & Legal

- **⚖️ Spanish Labor Law Compliance**
  - RD-Ley 8/2019 compliant with 5-year retention
  - Workers' Statute Article 34 enforcement
  - Automatic overtime tracking
  - Working time limits (40h/week, 9h/day)

- **📋 Convenio Support**
  - Pre-configured for Hosteleria de Murcia (30000805011981)
  - Customizable for any collective agreement
  - Annual hours tracking (1,822h/year default)
  - Weekly hours enforcement

- **🔒 GDPR Compliant**
  - No biometric data collection
  - Proper consent management
  - Data portability and deletion
  - EU data residency

### Management Tools

- **✅ Manager Approvals**
  - Edit requests require manager authorization
  - Audit trail for all changes
  - Comment/rejection system
  - Email notifications

- **📊 Signed Reports**
  - Monthly PDF reports with timestamps
  - Employee signature acknowledgment
  - Legally valid documentation
  - Automatic generation and archival

- **🌍 Multi-language Support**
  - Spanish (ES)
  - English (EN)
  - French (FR)
  - German (DE)
  - Polish (PL)
  - Dutch/Belgian (NL-BE)

---

## 🛠️ Tech Stack

Built with modern, enterprise-grade technologies:

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite + TypeScript | Modern, type-safe UI development |
| **Styling** | Tailwind CSS | Responsive, mobile-first design |
| **State Management** | TanStack Query + Zustand | Efficient data fetching and state |
| **Internationalization** | i18next | Multi-language support |
| **Backend** | NestJS + TypeScript | Scalable, maintainable API |
| **Database** | PostgreSQL 16 + Prisma | Reliable data persistence |
| **Queue System** | BullMQ + Redis | Background jobs and offline sync |
| **File Storage** | S3-compatible | Secure document storage |
| **Deployment** | Docker + Nginx | Production-ready infrastructure |

---

## 🚀 Getting Started

### Purchase a License First

**⚠️ REQUIRED**: You must purchase a valid license before deploying Torre Tempo.

**Contact for licensing:**
- 📧 Email: info@lsltgroup.es
- 🌐 Website: https://lsltgroup.es
- 💼 Request a quote or demo

### Production Deployment (After Licensing)

Once you have purchased a license, you will receive:
1. Access credentials to the private deployment repository
2. Your license key
3. Installation documentation
4. Technical support contact

Deploy Torre Tempo to your VPS server in minutes with the interactive installer:

```bash
# Download installer (requires license key)
# Instructions provided after purchase
```

The installer will guide you through:
1. Domain configuration (e.g., `tempo.yourcompany.com`)
2. Company/tenant setup
3. Admin account creation
4. SSL certificate installation
5. Database configuration

**That's it!** Your system will be live at `https://tempo.yourcompany.com`

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

### Custom Development & Modifications

**⚠️ IMPORTANT: Custom development and modifications require a commercial license.**

Torre Tempo is proprietary software. Unauthorized modification, customization, or development work is prohibited under the [LICENSE](LICENSE) agreement.

#### Want to Customize Torre Tempo?

We offer custom development services:

- **✨ Custom Features**: Add industry-specific functionality
- **🎨 White Label Branding**: Complete UI/UX customization
- **🔌 Integrations**: Connect with your existing systems (payroll, HR, ERP)
- **📊 Custom Reports**: Tailored reporting and analytics
- **🔧 API Development**: Custom endpoints for your needs

**Contact us for development services:**
- 📧 Email: info@lsltgroup.es
- 💼 Custom development quotes available
- 🤝 Partnership opportunities for agencies

#### For Licensed Developers

If you have purchased a **Distribution License** or **White Label License** that includes development rights:

1. Contact info@lsltgroup.es to receive access credentials
2. Sign the developer agreement
3. Receive private repository access and development documentation
4. Access to priority technical support

**Development is only permitted under a valid commercial license with explicit development rights.**

---

## 📁 Project Structure

```
torre-tempo/
├── apps/
│   ├── web/                    # React PWA Frontend
│   │   ├── src/
│   │   │   ├── features/       # Feature modules (auth, time-tracking, etc.)
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── lib/            # Utilities (API client, store, etc.)
│   │   │   └── i18n/           # Translation files
│   │   └── public/             # Static assets
│   │
│   └── api/                    # NestJS Backend
│       ├── src/
│       │   ├── auth/           # Authentication & authorization
│       │   ├── time-tracking/  # Clock-in/out logic
│       │   ├── locations/      # Work site management
│       │   ├── reports/        # PDF generation
│       │   ├── approvals/      # Manager approval workflows
│       │   └── prisma/         # Database service
│       └── prisma/
│           └── schema.prisma   # Database schema
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│
├── infra/                      # Infrastructure & deployment
│   ├── scripts/
│   │   ├── deploy-interactive.sh  # Guided installer
│   │   ├── deploy.sh              # Automated deployment
│   │   ├── update.sh              # Update script
│   │   └── backup.sh              # Database backup
│   ├── docker-compose.yml         # Development services
│   ├── docker-compose.prod.yml    # Production stack
│   └── nginx/                     # Reverse proxy config
│
└── docs/                       # Documentation
```

---

## ⚖️ Legal Compliance

Torre Tempo is designed to comply with:

### Spanish Labor Law
- **RD-Ley 8/2019**: Mandatory time tracking for all employees
- **Workers' Statute Article 34**: Working time limits (40h/week, 9h/day)
- **Convenio Collective Agreements**: Customizable per industry

### Data Protection
- **GDPR (EU)**: Complete compliance with EU data protection
  - No biometric data collection
  - Proper consent management
  - Right to be forgotten
  - Data portability
  - EU data residency options

### Industry Standards
- **Convenio Hosteleria de Murcia**: Pre-configured (30000805011981)
- **ISO 27001 Ready**: Security best practices implemented
- **5-Year Data Retention**: Automatic archival and compliance

---

## 📊 Roadmap

### Version 1.0 (Current)
- ✅ QR code + geofence clock-in/out
- ✅ Multi-tenant architecture
- ✅ Offline support (PWA)
- ✅ Manager approvals
- ✅ Multi-language support
- ✅ Spanish labor law compliance

### Version 1.1 (Q2 2026)
- 🔄 Advanced reporting dashboard
- 🔄 Mobile app (iOS/Android)
- 🔄 Shift scheduling
- 🔄 Employee self-service portal
- 🔄 Export to payroll systems

### Version 2.0 (Q4 2026)
- 📋 Biometric integration (optional)
- 📋 AI-powered anomaly detection
- 📋 Advanced analytics
- 📋 REST API for integrations
- 📋 Webhook support

---

## 📄 License

**Proprietary Software - LSLT Group**

This software is proprietary and confidential. Unauthorized copying, distribution,
or modification is strictly prohibited.

### Commercial Licensing

Torre Tempo is available for commercial licensing:

#### 🏢 Internal Use License
- Deploy for your own organization
- Unlimited employees and locations
- Full source code access
- Email support included

#### 💼 Distribution License
- Resell to your clients
- White-label branding options
- Custom development available
- Priority support and training

#### 🎨 White Label License
- Complete rebranding
- Custom features and integrations
- Dedicated account manager
- SLA guarantees

### Pricing (Starting From)

| Plan | Monthly | Annual (Save 20%) |
|------|---------|-------------------|
| **Starter** (Up to 50 employees) | €199 | €1,990 |
| **Professional** (Up to 200 employees) | €499 | €4,990 |
| **Enterprise** (Unlimited) | Contact us | Contact us |

**Contact for licensing:**
- 📧 Email: info@lsltgroup.es
- 🌐 Website: https://lsltgroup.es
- 📞 Phone: +34 XXX XXX XXX

See [LICENSE](LICENSE) for full legal terms.

---

## 📞 Support & Documentation

### Documentation
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](#) - REST API reference (coming soon)
- [User Manual](#) - End-user guide (coming soon)

### Support Channels
- **Email**: support@lsltgroup.es
- **GitHub Issues**: For bug reports and feature requests
- **Commercial Support**: Included with all licenses

### Professional Services
- **Custom Development**: Tailored features and integrations
- **Training**: On-site or remote training for your team
- **Consulting**: Labor law compliance consulting
- **Migration**: Data migration from existing systems

---

## 🤝 Contributing

This is proprietary software. For contribution opportunities or partnership inquiries,
please contact info@lsltgroup.es.

---

## 🙏 Acknowledgments

Built with love by **LSLT Group** for businesses that value compliance and efficiency.

Special thanks to:
- The Spanish hospitality industry for feedback and requirements
- Our early adopters and beta testers
- Open source community for the excellent tools

---

## 📸 Screenshots

### Employee View
![Clock In Screen](#) - *Coming soon*

### Manager Dashboard
![Dashboard](#) - *Coming soon*

### Reports
![Monthly Report](#) - *Coming soon*

---

**© 2026 LSLT Group. All rights reserved.**

For licensing inquiries: **info@lsltgroup.es**
