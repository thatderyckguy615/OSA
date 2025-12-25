# Email System

Multipart email templates (HTML + Plain Text) with retry logic and logging.

## Features

- **Multipart emails**: HTML with plain text fallback
- **Retry logic**: Exponential backoff (1s, 2s) for transient failures
- **Email event logging**: All sends logged to `email_events` table
- **Non-blocking**: Email failures never block core application flows

## Email Templates

All templates include:
- Addictive Leadership logo (150px, top-center)
- Modern, email-safe HTML (inline styles, max-width 600px)
- Plain text fallback for all content
- CTA buttons styled with brand colors (#e11d48 rose-600)
- Responsive design

### 1. Leader Welcome
**Sent**: On team creation  
**To**: Team leader  
**Contains**: Dashboard link + leader's personal assessment link  
**Template**: `buildLeaderWelcome()`

### 2. Participant Invite
**Sent**: On team creation, add member, or resend  
**To**: Team participant  
**Contains**: Assessment link + privacy statement  
**Template**: `buildParticipantInvite()`

### 3. Personal Results
**Sent**: On assessment completion  
**To**: Participant who just completed  
**Contains**: 3 dimension scores (Alignment, Execution, Accountability)  
**Template**: `buildPersonalResults()`

### 4. Report Ready
**Sent**: On report generation  
**To**: Team leader  
**Contains**: Report link + completion stats  
**Template**: `buildReportReady()`

## Usage

```typescript
import { sendLeaderWelcomeEmail } from '@/lib/email';

// All send functions return { success, messageId?, error? }
const result = await sendLeaderWelcomeEmail({
  leaderName: 'Jane Doe',
  firmName: 'Acme Accounting LLP',
  memberCount: 5,
  dashboardLink: 'https://...',
  assessmentLink: 'https://...',
  leaderEmail: 'jane@example.com',
  teamId: '...',
  teamMemberId: '...',
});

if (!result.success) {
  // Email failed, but core flow continues
  console.error('Email send failed:', result.error);
}
```

## Preview Emails

To preview HTML templates in the console:

```bash
npm run preview:email
```

This outputs all 4 email templates (HTML + subject lines) without requiring any environment variables or secrets.

## Environment Variables

- `RESEND_API_KEY`: Resend API key (required for sending)
- `RESEND_FROM_EMAIL`: From address (required for sending)
- `NEXT_PUBLIC_APP_URL`: Base URL for links and logo image (defaults to localhost:3000)

## Logo

The Addictive Leadership logo is served from `/public/addictive-leadership-logo.png` and links to:
https://addictiveleadership.com/program/accounting/

## Color Scheme

- **Primary CTA**: #e11d48 (rose-600)
- **Text Dark**: #0f172a (slate-900)
- **Text Medium**: #475569 (slate-600)
- **Text Light**: #64748b (slate-500)
- **Background**: #f8fafc (slate-50)
- **Blue Highlight**: #dbeafe (blue-50) with #1e40af (blue-800) text

## Architecture

- `templates.ts`: Email template builders (HTML + text)
- `send.ts`: Resend API integration with retry logic
- `logger.ts`: Database event logging and resend throttling
- `index.ts`: High-level public API (combines template + send + log)
- `client.ts`: Resend client initialization

## Testing

All email functions are async and return results rather than throwing errors. This ensures email failures never crash the application.

```typescript
// Email send never blocks core flow
const emailResult = await sendLeaderWelcomeEmail(params);
// Continue regardless of email success/failure
```

