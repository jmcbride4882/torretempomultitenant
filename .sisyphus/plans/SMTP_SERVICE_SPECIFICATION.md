# Torre Tempo - SMTP Service Implementation Specification

**Date:** 2026-01-29  
**Priority:** High (Phase 3)  
**Status:** Planning  

---

## Overview

SMTP service is **essential** for Torre Tempo to send email notifications for:
- Compliance violations (critical alerts)
- Report acknowledgment reminders
- Approval request notifications
- Schedule publication notifications
- Password reset emails
- Welcome emails for new users

**Legal Requirement:** Spanish labor law requires employees be notified of compliance violations promptly. Email is the most reliable notification channel.

---

## SMTP Service Options

### Option 1: SendGrid (Recommended)

**Pros:**
- ✅ **Reliable**: Industry-leading deliverability (99%+)
- ✅ **Easy Integration**: Official NestJS package (@sendgrid/mail)
- ✅ **Free Tier**: 100 emails/day (sufficient for LSLT Group)
- ✅ **Templates**: Visual email template editor
- ✅ **Analytics**: Open rates, click rates, bounce tracking
- ✅ **API Key Auth**: Simple authentication
- ✅ **Good Documentation**: Excellent docs and examples

**Cons:**
- ⚠️ Requires account registration
- ⚠️ US-based (GDPR considerations, but compliant)

**Cost:**
- Free: 100 emails/day forever
- Essentials: €15/month for 50,000 emails/month
- Pro: €90/month for 100,000 emails/month

**Recommended Tier:** Free (sufficient for <50 employees)

---

### Option 2: AWS SES (Amazon Simple Email Service)

**Pros:**
- ✅ **Scalable**: Unlimited emails
- ✅ **Cheap**: €0.10 per 1,000 emails
- ✅ **AWS Integration**: Native AWS ecosystem
- ✅ **High Reliability**: AWS infrastructure

**Cons:**
- ⚠️ **Complex Setup**: Requires AWS account, domain verification, IAM
- ⚠️ **Sandbox Mode**: Must request production access
- ⚠️ **More Configuration**: More complex than SendGrid
- ⚠️ **Requires AWS SDK**: More dependencies

**Cost:**
- €0.10 per 1,000 emails
- ~€1-2/month for typical usage

**Recommended for:** Companies already using AWS

---

### Option 3: Mailgun

**Pros:**
- ✅ **Developer-Friendly**: RESTful API
- ✅ **Free Tier**: 100 emails/day
- ✅ **EU Hosting**: EU servers available (GDPR)
- ✅ **Good Deliverability**: High reputation

**Cons:**
- ⚠️ **Credit Card Required**: Even for free tier
- ⚠️ **Less Popular**: Smaller community than SendGrid

**Cost:**
- Free: 100 emails/day
- Foundation: $35/month for 50,000 emails
- Growth: $80/month for 100,000 emails

---

### Option 4: Brevo (formerly Sendinblue)

**Pros:**
- ✅ **European**: French company (GDPR native)
- ✅ **Free Tier**: 300 emails/day
- ✅ **Marketing Features**: SMS, chat, CRM included
- ✅ **Spanish Support**: Good for Spanish companies

**Cons:**
- ⚠️ **Branding**: Free tier includes Brevo branding
- ⚠️ **Feature Overload**: More complex than needed

**Cost:**
- Free: 300 emails/day (with branding)
- Starter: €25/month for 20,000 emails
- Business: €65/month for 100,000 emails

---

### Recommendation: **SendGrid**

**Why SendGrid?**
1. **Ease of Use**: Simplest integration with NestJS
2. **Free Tier**: 100 emails/day is sufficient for LSLT Group (~50 employees)
3. **Reliability**: Industry-leading deliverability
4. **Documentation**: Excellent guides and examples
5. **No Credit Card**: Free tier doesn't require payment info
6. **Template Editor**: Visual email template builder

**For LSLT Group:** Start with SendGrid free tier. Upgrade to Essentials (€15/month) only if you exceed 100 emails/day.

---

## Implementation Specification

### 1. NestJS SMTP Module Setup

**Dependencies:**
```bash
npm install @nestgrid/mail
npm install --save-dev @types/sendgrid
```

**Environment Variables:**
```bash
# apps/api/.env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@lsltgroup.es
SENDGRID_FROM_NAME=Torre Tempo - LSLT Group
```

**Module Structure:**
```
apps/api/src/email/
├── email.module.ts
├── email.service.ts
├── dto/
│   ├── send-email.dto.ts
│   └── email-template.dto.ts
├── templates/
│   ├── compliance-violation.template.ts
│   ├── report-reminder.template.ts
│   ├── approval-request.template.ts
│   ├── schedule-published.template.ts
│   ├── password-reset.template.ts
│   └── welcome.template.ts
└── email.service.spec.ts
```

---

### 2. Email Service Implementation

```typescript
// apps/api/src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as SendGrid from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    SendGrid.setApiKey(apiKey);
  }

  /**
   * Send email using SendGrid
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const msg = {
        to,
        from: {
          email: this.configService.get<string>('SENDGRID_FROM_EMAIL'),
          name: this.configService.get<string>('SENDGRID_FROM_NAME'),
        },
        subject,
        html,
      };

      await SendGrid.send(msg);
      this.logger.log(`Email sent successfully to ${to}: ${subject}`);
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
    const subject = `⚠️ Compliance Violation Detected - ${violation.severity}`;
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
    const subject = `📄 Monthly Report Ready - Please Acknowledge`;
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
    const subject = `✋ Edit Request Pending - ${request.employeeName}`;
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
    const subject = `📅 Your Schedule for Week of ${schedule.weekStart}`;
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
    const subject = `🔐 Password Reset Request - Torre Tempo`;
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
    const subject = `👋 Welcome to Torre Tempo - ${tenantName}`;
    const html = this.renderWelcomeTemplate(userName, tenantName, loginUrl);
    await this.sendEmail(to, subject, html);
  }

  // Template rendering methods (see below for templates)
  private renderComplianceViolationTemplate(userName: string, violation: any): string {
    // See templates section below
  }

  // ... more template methods
}
```

---

### 3. Email Templates

**Design Principles:**
- ✅ Mobile-responsive (60% of emails opened on mobile)
- ✅ Plain text fallback (accessibility)
- ✅ Clear call-to-action buttons
- ✅ LSLT Group branding
- ✅ Spanish + English versions
- ✅ Dark mode friendly colors

**Template: Compliance Violation Alert**

```typescript
// apps/api/src/email/templates/compliance-violation.template.ts
export function renderComplianceViolationTemplate(
  userName: string,
  violation: {
    type: string;
    description: string;
    severity: string;
    detectedAt: Date;
  }
): string {
  const severityColor = {
    MINOR: '#f59e0b', // amber
    SERIOUS: '#f97316', // orange
    VERY_SERIOUS: '#dc2626', // red
  }[violation.severity];

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Violation</title>
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
                ⚠️ Compliance Violation Detected
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
                <a href="${process.env.FRONTEND_URL}/compliance/violations" 
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
```

**Template: Report Acknowledgment Reminder**

```typescript
// apps/api/src/email/templates/report-reminder.template.ts
export function renderReportReminderTemplate(
  userName: string,
  report: { period: string; url: string }
): string {
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
```

**Additional Templates:**
- `approval-request.template.ts` - Manager notification for edit requests
- `schedule-published.template.ts` - Employee notification for new schedules
- `password-reset.template.ts` - Password reset link
- `welcome.template.ts` - New user welcome email

---

### 4. Notification Triggers

**When to Send Emails:**

| Event | Recipient | Template | Priority |
|-------|-----------|----------|----------|
| Compliance violation detected | Employee + Manager | compliance-violation | High |
| Monthly report ready | Employee | report-reminder | High |
| Edit request created | Manager | approval-request | Medium |
| Edit request approved/rejected | Employee | approval-decision | Medium |
| Schedule published | Employee | schedule-published | Low |
| New user created | User | welcome | Low |
| Password reset requested | User | password-reset | High |

**Example Integration:**

```typescript
// apps/api/src/compliance/compliance.service.ts
async detectViolations(timeEntry: TimeEntry): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = [];
  
  // ... existing violation detection logic
  
  // Send email notification for each violation
  for (const violation of violations) {
    // Notify employee
    await this.emailService.sendComplianceViolation(
      violation.user.email,
      `${violation.user.firstName} ${violation.user.lastName}`,
      violation
    );
    
    // Notify manager if serious or very serious
    if (violation.severity !== 'MINOR') {
      const manager = await this.usersService.getManager(violation.userId);
      if (manager) {
        await this.emailService.sendComplianceViolation(
          manager.email,
          `${manager.firstName} ${manager.lastName}`,
          violation
        );
      }
    }
  }
  
  return violations;
}
```

---

### 5. Testing Strategy

**Unit Tests:**
```typescript
// apps/api/src/email/email.service.spec.ts
describe('EmailService', () => {
  let service: EmailService;
  let sendGridMock: jest.SpyInstance;

  beforeEach(async () => {
    sendGridMock = jest.spyOn(SendGrid, 'send').mockResolvedValue(undefined);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService, ConfigService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should send compliance violation email', async () => {
    await service.sendComplianceViolation(
      'test@example.com',
      'John Doe',
      {
        type: 'INSUFFICIENT_REST',
        description: 'Only 10h rest',
        severity: 'SERIOUS',
        detectedAt: new Date(),
      }
    );

    expect(sendGridMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Compliance Violation'),
      })
    );
  });
});
```

**Integration Tests:**
```typescript
// Test with real SendGrid (staging environment)
describe('EmailService Integration', () => {
  it('should send real email to test account', async () => {
    const result = await emailService.sendEmail(
      'test@lsltgroup.es',
      'Test Email',
      '<p>This is a test</p>'
    );
    
    expect(result).toBeDefined();
  });
});
```

**Manual Testing:**
1. Create test SendGrid account
2. Configure test API key
3. Send test emails to yourself
4. Verify delivery, formatting, mobile rendering
5. Test spam filters (Gmail, Outlook)

---

### 6. Configuration & Deployment

**Environment Variables:**

```bash
# .env.production
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@lsltgroup.es
SENDGRID_FROM_NAME=Torre Tempo - LSLT Group
FRONTEND_URL=https://time.lsltgroup.es
```

**Docker Compose:**
```yaml
# infra/docker-compose.prod.yml
services:
  api:
    environment:
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - SENDGRID_FROM_EMAIL=${SENDGRID_FROM_EMAIL}
      - SENDGRID_FROM_NAME=${SENDGRID_FROM_NAME}
      - FRONTEND_URL=${FRONTEND_URL}
```

**Domain Setup:**

1. **Verify Domain with SendGrid:**
   - Add CNAME records to DNS
   - Verify domain ownership
   - Enable link branding

2. **SPF Record:**
   ```
   v=spf1 include:sendgrid.net ~all
   ```

3. **DKIM Setup:**
   - SendGrid provides DKIM keys
   - Add to DNS as CNAME records

4. **DMARC Policy:**
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@lsltgroup.es
   ```

---

### 7. Monitoring & Debugging

**SendGrid Dashboard:**
- View sent emails
- Track delivery rates
- Monitor bounces and spam complaints
- View open rates (if tracking enabled)

**Logging:**
```typescript
// Log all email attempts
this.logger.log(`Email sent to ${to}: ${subject}`);
this.logger.error(`Email failed to ${to}: ${error.message}`);
```

**Alerts:**
- SendGrid webhook for bounce notifications
- Alert if delivery rate drops below 95%
- Alert if spam complaints exceed threshold

---

### 8. Security Considerations

**Best Practices:**
- ✅ Store API key in environment variables (never in code)
- ✅ Rotate API keys quarterly
- ✅ Use least-privilege API keys (send-only, no read access)
- ✅ Rate limiting (prevent email bombing)
- ✅ Validate recipient emails before sending
- ✅ No sensitive data in email subject lines
- ✅ Use HTTPS links only
- ✅ Implement unsubscribe mechanism (for non-critical emails)

**Rate Limiting:**
```typescript
// Prevent abuse
private async rateLimitCheck(email: string): Promise<boolean> {
  const key = `email:${email}`;
  const count = await this.redis.incr(key);
  
  if (count === 1) {
    await this.redis.expire(key, 3600); // 1 hour
  }
  
  // Max 10 emails per hour per recipient
  return count <= 10;
}
```

---

### 9. Cost Estimates

**SendGrid Free Tier:**
- 100 emails/day = 3,000 emails/month
- For 50 employees:
  - Compliance violations: ~10/month
  - Report reminders: 50/month
  - Approval requests: ~20/month
  - Schedule notifications: ~200/month
  - **Total: ~280/month** (well within free tier)

**When to Upgrade:**
- If exceeding 100 emails/day (3,000/month)
- If need advanced features (A/B testing, segmentation)
- If need priority support

**Essentials Tier (€15/month):**
- 50,000 emails/month
- Email validation API
- Dedicated IP (optional)
- Phone support

---

### 10. Implementation Checklist

**Week 6 - Day 1 (SMTP Setup):**
- [ ] Create SendGrid account
- [ ] Generate API key
- [ ] Verify domain (lsltgroup.es)
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Test email delivery

**Week 6 - Day 2 (Email Service):**
- [ ] Install @sendgrid/mail package
- [ ] Create EmailService with sendEmail method
- [ ] Add environment variables
- [ ] Write unit tests
- [ ] Test with real API key

**Week 6 - Day 3 (Email Templates):**
- [ ] Create compliance violation template
- [ ] Create report reminder template
- [ ] Create approval request template
- [ ] Create schedule published template
- [ ] Create password reset template
- [ ] Create welcome email template

**Week 6 - Day 4 (Integration):**
- [ ] Integrate with ComplianceService
- [ ] Integrate with ReportsService
- [ ] Integrate with ApprovalsService
- [ ] Integrate with SchedulingService
- [ ] Integrate with AuthService

**Week 6 - Day 5 (Testing):**
- [ ] Send test emails to all addresses
- [ ] Verify mobile rendering
- [ ] Check spam filters (Gmail, Outlook)
- [ ] Verify link branding
- [ ] Monitor SendGrid dashboard

---

## Alternative: Self-Hosted SMTP

If SendGrid/cloud services are not acceptable, you can use **Postfix** (self-hosted SMTP server):

**Pros:**
- ✅ Full control
- ✅ No third-party dependencies
- ✅ No API limits

**Cons:**
- ⚠️ Complex setup (Postfix + SPF + DKIM + DMARC)
- ⚠️ Deliverability challenges (IP reputation)
- ⚠️ Maintenance overhead
- ⚠️ Risk of being blacklisted

**Not Recommended** unless you have specific compliance requirements that prevent using cloud services.

---

## Summary

**Recommendation:** Use **SendGrid** with the **free tier** (100 emails/day).

**Timeline:** 
- Setup: 1 day
- Implementation: 4 days
- Total: 5 days (Week 6)

**Cost:**
- Free tier: €0/month (sufficient for LSLT Group)
- Upgrade only if needed: €15/month

**Benefits:**
- ✅ Legally compliant notifications
- ✅ Better user experience
- ✅ Reduced support burden
- ✅ Improved engagement

**Next Steps:**
1. Create SendGrid account (this week)
2. Verify domain (lsltgroup.es)
3. Begin implementation in Week 6

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**Status:** Ready for Implementation
