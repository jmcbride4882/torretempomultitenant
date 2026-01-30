# Torre Tempo - Gmail SMTP Configuration

**Date:** 2026-01-29  
**Priority:** High  
**Status:** Ready to Implement  

---

## Overview

Torre Tempo will use **Google Mail (Gmail/Google Workspace)** for SMTP email notifications instead of third-party services like SendGrid.

**Benefits:**
- ✅ Already have Google Workspace account
- ✅ No additional costs
- ✅ Trusted domain reputation
- ✅ No API keys to manage
- ✅ Full control over email infrastructure

---

## Gmail SMTP Configuration

### 1. SMTP Server Details

**For Google Workspace (lsltgroup.es):**
```
SMTP Server: smtp.gmail.com
SMTP Port: 587 (TLS) or 465 (SSL)
SMTP Security: STARTTLS or SSL/TLS
SMTP Username: noreply@lsltgroup.es
SMTP Password: [App Password]
```

**Recommended:** Use port 587 with STARTTLS (more compatible)

---

### 2. Google Workspace Setup

#### Option A: App Passwords (Recommended for Single Account)

**Steps:**
1. Go to Google Account settings: https://myaccount.google.com/
2. Security → 2-Step Verification (must be enabled)
3. Security → App passwords
4. Generate app password for "Mail"
5. Use this password in environment variables

**Pros:**
- ✅ Simple setup
- ✅ No OAuth complexity
- ✅ Works immediately

**Cons:**
- ⚠️ Requires 2FA enabled
- ⚠️ Password needs to be stored securely

---

#### Option B: OAuth2 (Recommended for Production)

**Steps:**
1. Create Google Cloud project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Get client ID, client secret, refresh token
5. Use OAuth2 in Nodemailer

**Pros:**
- ✅ More secure (no password storage)
- ✅ Revocable access
- ✅ Better for production

**Cons:**
- ⚠️ More complex setup
- ⚠️ Requires Google Cloud project

**For LSLT Group:** Start with **App Passwords** (simpler), upgrade to OAuth2 later if needed.

---

### 3. Gmail Sending Limits

**Google Workspace Limits:**
- 2,000 emails per day (per account)
- 500 recipients per email
- 10,000 emails per day (with relaxed limits)

**For LSLT Group (~50 employees):**
- Compliance violations: ~10/month
- Report reminders: 50/month
- Approval requests: ~20/month
- Schedule notifications: ~200/month
- **Total: ~280/month** ✅ **Well within limits!**

**No cost** - included with Google Workspace

---

## Implementation with Nodemailer

### 1. Install Dependencies

```bash
cd apps/api
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Environment Variables

```bash
# apps/api/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for port 587
SMTP_USER=noreply@lsltgroup.es
SMTP_PASS=xxxx xxxx xxxx xxxx  # App password (16 chars with spaces)
SMTP_FROM_EMAIL=noreply@lsltgroup.es
SMTP_FROM_NAME=Torre Tempo - LSLT Group
```

### 3. Email Service Implementation

```typescript
// apps/api/src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'), // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Verify connection on startup
    this.verifyConnection();
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('SMTP connection failed:', error.message);
    }
  }

  /**
   * Send email using Gmail SMTP
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: {
          name: this.configService.get<string>('SMTP_FROM_NAME'),
          address: this.configService.get<string>('SMTP_FROM_EMAIL'),
        },
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      // Don't throw - email failures shouldn't break application flow
    }
  }

  /**
   * Send compliance violation alert
   */
  async sendComplianceViolation(
    to: string,
    userName: string,
    violation: {
      type: string;
      description: string;
      severity: string;
      detectedAt: Date;
    }
  ): Promise<void> {
    const subject = `⚠️ Alerta de Cumplimiento - ${violation.severity}`;
    const html = this.renderComplianceViolationTemplate(userName, violation);
    await this.sendEmail(to, subject, html);
  }

  /**
   * Send report acknowledgment reminder
   */
  async sendReportReminder(
    to: string,
    userName: string,
    report: {
      period: string;
      url: string;
    }
  ): Promise<void> {
    const subject = `📄 Informe Mensual Listo - Por Favor Firmar`;
    const html = this.renderReportReminderTemplate(userName, report);
    await this.sendEmail(to, subject, html);
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequest(
    to: string,
    managerName: string,
    request: {
      employeeName: string;
      fieldName: string;
      oldValue: string;
      newValue: string;
      reason: string;
      url: string;
    }
  ): Promise<void> {
    const subject = `✋ Solicitud de Edición Pendiente - ${request.employeeName}`;
    const html = this.renderApprovalRequestTemplate(managerName, request);
    await this.sendEmail(to, subject, html);
  }

  /**
   * Send schedule published notification
   */
  async sendSchedulePublished(
    to: string,
    userName: string,
    schedule: {
      weekStart: string;
      shiftsCount: number;
      url: string;
    }
  ): Promise<void> {
    const subject = `📅 Tu Horario para la Semana del ${schedule.weekStart}`;
    const html = this.renderSchedulePublishedTemplate(userName, schedule);
    await this.sendEmail(to, subject, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    to: string,
    userName: string,
    resetToken: string,
    expiresIn: string
  ): Promise<void> {
    const subject = `🔐 Restablecimiento de Contraseña - Torre Tempo`;
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const html = this.renderPasswordResetTemplate(userName, resetUrl, expiresIn);
    await this.sendEmail(to, subject, html);
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    to: string,
    userName: string,
    tenantName: string,
    loginUrl: string
  ): Promise<void> {
    const subject = `👋 Bienvenido a Torre Tempo - ${tenantName}`;
    const html = this.renderWelcomeTemplate(userName, tenantName, loginUrl);
    await this.sendEmail(to, subject, html);
  }

  // Template rendering methods (same as before)
  private renderComplianceViolationTemplate(userName: string, violation: any): string {
    const severityColor = {
      MINOR: '#f59e0b',
      SERIOUS: '#f97316',
      VERY_SERIOUS: '#dc2626',
    }[violation.severity];

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Cumplimiento</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${severityColor}; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">
                ⚠️ Alerta de Cumplimiento Laboral
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">
                Hola ${userName},
              </p>
              
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Se ha detectado una violación de cumplimiento laboral en tu registro de jornada:
              </p>

              <!-- Violation Details Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid ${severityColor}; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #78350f; font-weight: 600; font-size: 14px;">
                  ${violation.type.replace(/_/g, ' ')}
                </p>
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
                  ${violation.description}
                </p>
                <p style="margin: 0; color: #92400e; font-size: 12px;">
                  Gravedad: <strong>${violation.severity}</strong>
                </p>
                <p style="margin: 8px 0 0; color: #92400e; font-size: 12px;">
                  Detectado: ${new Date(violation.detectedAt).toLocaleString('es-ES')}
                </p>
              </div>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Esta violación puede resultar en sanciones para la empresa. Por favor, contacta con tu supervisor para resolverla.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="${this.configService.get('FRONTEND_URL')}/compliance/violations" 
                   style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Ver Detalles
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Torre Tempo - Sistema de Fichaje LSLT Group
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2026 LSLT Group | Desarrollado por John McBride
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private renderReportReminderTemplate(userName: string, report: any): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">
                📄 Informe Mensual Listo
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">
                Hola ${userName},
              </p>
              
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Tu informe mensual de jornada para <strong>${report.period}</strong> está listo para revisión y firma.
              </p>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Por favor, revisa el informe y firma digitalmente para confirmar que los datos son correctos. 
                Esto es un requisito legal bajo RD-Ley 8/2019.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="${report.url}" 
                   style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Revisar y Firmar Informe
                </a>
              </div>

              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Si tienes alguna duda sobre tu informe, contacta con tu supervisor.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Torre Tempo - Sistema de Fichaje LSLT Group
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2026 LSLT Group | Desarrollado por John McBride
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private renderApprovalRequestTemplate(managerName: string, request: any): string {
    return `[Similar HTML template for approval requests]`;
  }

  private renderSchedulePublishedTemplate(userName: string, schedule: any): string {
    return `[Similar HTML template for schedules]`;
  }

  private renderPasswordResetTemplate(userName: string, resetUrl: string, expiresIn: string): string {
    return `[Similar HTML template for password reset]`;
  }

  private renderWelcomeTemplate(userName: string, tenantName: string, loginUrl: string): string {
    return `[Similar HTML template for welcome]`;
  }
}
```

### 4. Email Module

```typescript
// apps/api/src/email/email.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

---

## Testing Gmail SMTP

### 1. Test Email Service

```typescript
// apps/api/src/email/email.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                SMTP_HOST: 'smtp.gmail.com',
                SMTP_PORT: 587,
                SMTP_SECURE: false,
                SMTP_USER: 'test@lsltgroup.es',
                SMTP_PASS: 'test-password',
                SMTP_FROM_EMAIL: 'noreply@lsltgroup.es',
                SMTP_FROM_NAME: 'Torre Tempo Test',
                FRONTEND_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send compliance violation email', async () => {
    // Mock test - actual sending tested manually
    const spy = jest.spyOn(service, 'sendComplianceViolation');
    
    await service.sendComplianceViolation(
      'test@lsltgroup.es',
      'John Doe',
      {
        type: 'INSUFFICIENT_REST',
        description: 'Only 10h rest',
        severity: 'SERIOUS',
        detectedAt: new Date(),
      }
    );

    expect(spy).toHaveBeenCalled();
  });
});
```

### 2. Manual Testing

```bash
# Create test endpoint
# apps/api/src/email/email.controller.ts (for testing only)

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('test')
  async testEmail() {
    await this.emailService.sendEmail(
      'your-email@lsltgroup.es',
      'Test Email from Torre Tempo',
      '<h1>Test</h1><p>This is a test email.</p>'
    );
    return { message: 'Test email sent' };
  }
}
```

---

## Security Best Practices

### 1. Secure Password Storage

```bash
# NEVER commit .env file
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### 2. Environment Variables

```bash
# Use environment variables for sensitive data
# In production, use Docker secrets or vault

# docker-compose.prod.yml
services:
  api:
    environment:
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_SECURE=${SMTP_SECURE}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
```

### 3. Rate Limiting

```typescript
// Prevent email bombing
private emailRateLimiter = new Map<string, number>();

async sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Rate limit: max 10 emails per hour per recipient
  const key = `${to}:${new Date().getHours()}`;
  const count = this.emailRateLimiter.get(key) || 0;
  
  if (count >= 10) {
    this.logger.warn(`Rate limit exceeded for ${to}`);
    return;
  }
  
  this.emailRateLimiter.set(key, count + 1);
  
  // Send email...
}
```

---

## Troubleshooting

### Common Issues

**1. "Invalid login" error:**
- Ensure 2FA is enabled on Google account
- Use App Password, not regular password
- Check username is full email address

**2. "Connection timeout":**
- Check firewall allows outbound on port 587
- Verify SMTP_HOST is correct (smtp.gmail.com)
- Try port 465 with SMTP_SECURE=true

**3. "Quota exceeded":**
- Gmail limits: 2,000 emails/day
- Monitor usage in Google Admin console
- Implement rate limiting

**4. "Sender address rejected":**
- Ensure SMTP_USER matches SMTP_FROM_EMAIL
- Or use alias configured in Google Workspace

---

## Implementation Checklist

**Setup (30 minutes):**
- [ ] Enable 2FA on noreply@lsltgroup.es account
- [ ] Generate App Password
- [ ] Add SMTP credentials to .env file
- [ ] Test SMTP connection

**Development (2-3 hours):**
- [ ] Install nodemailer package
- [ ] Create EmailService with Gmail configuration
- [ ] Implement email template methods
- [ ] Create EmailModule
- [ ] Write unit tests
- [ ] Manual testing with test endpoint

**Integration (1-2 hours):**
- [ ] Import EmailModule in AppModule
- [ ] Integrate with ComplianceService
- [ ] Integrate with ReportsService
- [ ] Integrate with ApprovalsService
- [ ] Remove test endpoint

**Deployment:**
- [ ] Add SMTP env vars to production .env
- [ ] Test email delivery in production
- [ ] Monitor Gmail sending limits
- [ ] Set up alerts for failures

---

## Cost

**Gmail SMTP with Google Workspace:**
- ✅ **FREE** (included with Google Workspace subscription)
- ✅ 2,000 emails/day limit (more than sufficient)
- ✅ No additional setup fees
- ✅ Trusted domain reputation

---

## Summary

**Benefits of Gmail SMTP:**
1. ✅ No cost (included with Google Workspace)
2. ✅ Already have domain and account
3. ✅ Trusted sender reputation
4. ✅ Simple setup with Nodemailer
5. ✅ 2,000 emails/day limit (sufficient for LSLT)

**vs. SendGrid:**
- Gmail: Free, but requires Google Workspace
- SendGrid: Free tier 100/day, paid plans for more
- **Winner:** Gmail (since LSLT already has Google Workspace)

**Next Steps:**
1. Generate App Password for noreply@lsltgroup.es
2. Implement EmailService with Nodemailer
3. Test email delivery
4. Integrate with compliance notifications

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**Status:** Ready to Implement
