# Client Portal User Guide

## Overview

The SynthStack Client Portal provides secure, self-service access for your clients to view their projects, track tasks, communicate with your team, and manage invoices - all in one centralized location.

## Key Features

- **Project Dashboard**: View all projects you're involved in
- **Task Tracking**: Monitor progress on client-visible tasks
- **Conversations**: Direct messaging with your service provider
- **Invoice Management**: View and pay invoices online
- **Document Library**: Access project files and deliverables
- **AI Assistant**: Get instant answers about your projects (tier-based)
- **Proposal Review**: Review and approve project proposals

---

## Getting Started

### 1. Creating Your Account

Your service provider will invite you to the client portal via email. Follow these steps:

1. **Check Your Email**: Look for an invitation from your service provider
2. **Click Activation Link**: Click the "Activate Account" button in the email
3. **Set Password**: Create a secure password (minimum 8 characters)
4. **Log In**: Use your email and password to access the portal

**Login URL**: `https://your-portal.synthstack.app/portal/login`

### 2. First Login

On your first login, you'll see:

- **Welcome Tour**: Quick walkthrough of portal features
- **Profile Setup**: Add your phone number and job title (optional)
- **Notification Preferences**: Choose how you want to be notified

### 3. Portal Navigation

The portal has four main sections:

```
┌─────────────────────────────────────┐
│  [Logo]  Projects  Tasks  Messages  │  ← Top Navigation
├─────────────────────────────────────┤
│                                     │
│  [Main Content Area]                │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [AI Copilot Button]                │  ← Bottom Right
└─────────────────────────────────────┘
```

---

## Core Features

### Projects

#### Viewing Your Projects

**Navigate to**: Projects → All Projects

You'll see a list of all projects you have access to:

```
┌──────────────────────────────────────────┐
│ Website Redesign              [Active]   │
│ Status: In Progress                      │
│ Started: Jan 15, 2026                    │
│ [View Details]                           │
├──────────────────────────────────────────┤
│ Mobile App Development        [Active]   │
│ Status: Planning                         │
│ Started: Feb 1, 2026                     │
│ [View Details]                           │
└──────────────────────────────────────────┘
```

**Project Card Information**:
- Project name and status badge
- Current phase/status
- Start date and estimated completion
- Quick action button

#### Project Details

Click "View Details" to see:

**Overview Tab**:
- Project description and goals
- Timeline and milestones
- Team members assigned
- Project health indicators

**Tasks Tab**:
- All client-visible tasks for this project
- Task status (To Do, In Progress, Completed)
- Assigned team members
- Due dates

**Files Tab**:
- Project deliverables
- Shared documents
- Design assets
- Download or preview files

**Conversations Tab**:
- Project-specific discussions
- Message history
- File attachments

### Tasks

#### Task List View

**Navigate to**: Tasks → My Tasks

See all tasks across all your projects:

```
┌────────────────────────────────────────────────┐
│ Filters: [All] [Active] [Completed]            │
├────────────────────────────────────────────────┤
│ ☐ Review homepage design mockup               │
│   Website Redesign • Due: Jan 20 • High       │
├────────────────────────────────────────────────┤
│ ☐ Provide app feature feedback                │
│   Mobile App • Due: Jan 25 • Medium           │
├────────────────────────────────────────────────┤
│ ✓ Approve project timeline                    │
│   Website Redesign • Completed: Jan 18        │
└────────────────────────────────────────────────┘
```

**Task Filters**:
- **All**: Every task you have access to
- **Active**: Tasks that are pending or in progress
- **Completed**: Finished tasks
- **By Project**: Filter by specific project
- **By Priority**: High, Medium, Low

#### Task Details

Click on any task to see:

- **Description**: Detailed task information
- **Client Notes**: Special instructions or context for you
- **Attachments**: Related files or resources
- **Comments**: Discussion thread with team
- **Activity Log**: History of changes

**Note**: You can only see tasks marked as "visible to client" by your service provider. Internal tasks are hidden.

### Conversations

#### Messaging Center

**Navigate to**: Messages → Inbox

Central hub for all communications:

```
┌────────────────────────────────────────────────┐
│ CONVERSATIONS                                  │
├────────────────────────────────────────────────┤
│ 🔵 Website Redesign - Design Review            │
│    Last message: 2 hours ago                   │
│    "The mockups look great! Just one..."       │
├────────────────────────────────────────────────┤
│    Mobile App - Feature Discussion             │
│    Last message: Yesterday                     │
│    "Let's schedule a call to discuss..."       │
├────────────────────────────────────────────────┤
│    Billing Question                            │
│    Last message: 3 days ago                    │
│    "Your invoice has been sent."               │
└────────────────────────────────────────────────┘
```

**Conversation Features**:
- 🔵 Blue dot indicates unread messages
- Conversations grouped by project or topic
- Search and filter capabilities
- File attachments supported

#### Sending Messages

1. **Open Conversation**: Click on any conversation
2. **Type Message**: Use the text box at the bottom
3. **Attach Files** (optional): Click paperclip icon
4. **Send**: Press Enter or click Send button

**Message Options**:
- **Text Formatting**: Bold, italic, lists
- **File Attachments**: Up to 10MB per file
- **@Mentions**: Tag specific team members
- **Priority Flags**: Mark urgent messages

**Privacy Note**: Internal team notes are not visible to you. You only see messages intended for clients.

### Invoices

#### Invoice Dashboard

**Navigate to**: Billing → Invoices

View all invoices for your organization:

```
┌────────────────────────────────────────────────┐
│ INVOICE SUMMARY                                │
│ Total Outstanding: $4,250.00                   │
│ Paid This Year: $12,000.00                     │
├────────────────────────────────────────────────┤
│ Invoice #1024              Due: Jan 30, 2026   │
│ Website Redesign - Phase 1                     │
│ Amount: $2,500.00          [Pay Now] [View]    │
├────────────────────────────────────────────────┤
│ Invoice #1018              Paid: Jan 15, 2026  │
│ Mobile App - Discovery                         │
│ Amount: $1,750.00          ✓ Paid              │
└────────────────────────────────────────────────┘
```

**Invoice Statuses**:
- **Draft**: Not yet finalized
- **Sent**: Awaiting payment
- **Paid**: Payment received
- **Overdue**: Past due date
- **Partially Paid**: Partial payment applied

#### Invoice Details

Click "View" to see full invoice:

- **Invoice Header**: Number, date, due date
- **Line Items**: Detailed breakdown of charges
- **Subtotal & Taxes**: Itemized totals
- **Payment History**: Previous payments applied
- **Payment Options**: Online payment methods

#### Making Payments

1. Click **"Pay Now"** on invoice
2. Choose payment method:
   - Credit/Debit Card
   - ACH Bank Transfer
   - PayPal (if enabled)
3. Enter payment details
4. Review and confirm
5. Receive payment confirmation email

**Payment Security**: All payments are processed through secure, PCI-compliant gateways.

### Document Library

#### Accessing Files

**Navigate to**: Projects → [Project Name] → Files

Or: Documents → All Files

```
┌────────────────────────────────────────────────┐
│ PROJECT FILES                                  │
├────────────────────────────────────────────────┤
│ 📄 Homepage_Mockup_v3.pdf                      │
│    Added: Jan 18, 2026 • 2.4 MB               │
│    [Download] [Preview]                        │
├────────────────────────────────────────────────┤
│ 📊 Project_Timeline.xlsx                       │
│    Added: Jan 15, 2026 • 156 KB               │
│    [Download] [Preview]                        │
├────────────────────────────────────────────────┤
│ 🎨 Brand_Guidelines.pdf                        │
│    Added: Jan 10, 2026 • 5.1 MB               │
│    [Download] [Preview]                        │
└────────────────────────────────────────────────┘
```

**File Operations**:
- **Download**: Save file to your device
- **Preview**: View in browser (PDFs, images, videos)
- **Share**: Get shareable link (if enabled)

**File Types Supported**:
- Documents: PDF, DOC, DOCX, TXT
- Spreadsheets: XLS, XLSX, CSV
- Images: JPG, PNG, GIF, SVG
- Videos: MP4, MOV, AVI
- Archives: ZIP, RAR

**Storage**: Files are stored securely and backed up daily.

### Proposals

#### Reviewing Proposals

**Navigate to**: Proposals → Pending Approval

When your service provider sends a proposal:

```
┌────────────────────────────────────────────────┐
│ PROPOSAL: Website Redesign - Phase 2          │
│ Status: Awaiting Your Approval                │
├────────────────────────────────────────────────┤
│ Executive Summary                              │
│ [Proposal content here...]                     │
│                                                │
│ Scope of Work                                  │
│ • Homepage redesign                            │
│ • Product page templates                       │
│ • Mobile responsiveness                        │
│                                                │
│ Investment: $7,500                             │
│ Timeline: 6 weeks                              │
│                                                │
│ [Approve & Sign] [Request Changes] [Decline]  │
└────────────────────────────────────────────────┘
```

#### Approving a Proposal

1. **Review Content**: Read all sections carefully
2. **Check Scope**: Verify deliverables match your needs
3. **Review Terms**: Understand timeline and payment terms
4. **Add Comments** (optional): Ask questions or request changes
5. **Sign**: Click "Approve & Sign"
6. **E-Signature**: Type your name or draw signature
7. **Confirm**: Receive confirmation email

**Proposal Status**:
- **Draft**: Still being prepared
- **Pending Review**: Waiting for your review
- **Approved**: You've signed and approved
- **Declined**: You've declined the proposal
- **Revision Requested**: You've asked for changes

---

## AI Assistant (Copilot)

### Overview

The portal includes an AI assistant to help you:

- Get quick answers about your projects
- Find specific tasks or files
- Check invoice status
- Summarize recent activity
- Navigate the portal

### Access Levels

Your AI assistant access depends on your portal tier:

| Tier | Daily Messages | Features |
|------|----------------|----------|
| **Community** | 100 | Basic project Q&A |
| **Subscriber** | 500 | + Task recommendations |
| **Premium** | 2,000 | + Advanced insights |
| **Lifetime** | Unlimited | + Priority support |

### Using the AI Assistant

#### Opening the Copilot

Click the floating **AI Copilot** button in the bottom-right corner:

```
┌──────────────────────────────────────┐
│                                      │
│  [Your portal content here]          │
│                                      │
│                              [🤖]    │  ← Click here
└──────────────────────────────────────┘
```

#### Asking Questions

**Example Questions**:

1. **Project Status**:
   - "What's the status of my Website Redesign project?"
   - "When is the Mobile App project expected to be completed?"

2. **Tasks**:
   - "What tasks need my attention this week?"
   - "Show me completed tasks from last month"

3. **Invoices**:
   - "Do I have any unpaid invoices?"
   - "What was my total spend in Q1 2026?"

4. **Files**:
   - "Find the latest homepage mockup"
   - "Show me all PDFs from the Website project"

5. **General Help**:
   - "How do I pay an invoice?"
   - "Where can I see project files?"

#### AI Context & Privacy

**What the AI Can See**:
- ✅ Your projects and tasks
- ✅ Your conversations (non-internal messages)
- ✅ Your invoices and payments
- ✅ Files you have access to

**What the AI Cannot See**:
- ❌ Other clients' data
- ❌ Internal team notes
- ❌ Hidden tasks or projects
- ❌ Confidential team discussions

**Data Privacy**: All AI conversations are encrypted and only accessible by you and your service provider.

### Rate Limits

If you exceed your daily message limit:

```
┌──────────────────────────────────────┐
│  ⚠️ Daily AI Message Limit Reached   │
│                                      │
│  You've used all 100 messages today. │
│  Resets in: 6 hours 23 minutes       │
│                                      │
│  [Upgrade to Premium] [Close]        │
└──────────────────────────────────────┘
```

**Options**:
- Wait for reset (midnight UTC)
- Upgrade to higher tier for more messages
- Contact your service provider for assistance

---

## Account Management

### Profile Settings

**Navigate to**: Account → Profile

Update your personal information:

- **Name**: First and last name
- **Email**: Contact email (requires verification to change)
- **Phone**: Mobile or office number
- **Job Title**: Your role in the organization
- **Avatar**: Upload profile picture
- **Time Zone**: For accurate timestamps
- **Language**: Portal interface language

### Notification Preferences

**Navigate to**: Account → Notifications

Control how you're notified:

**Email Notifications**:
- ☑ New messages in conversations
- ☑ Task assignments or updates
- ☑ Invoice received or due soon
- ☑ Project milestone completed
- ☐ Weekly activity summary

**In-App Notifications**:
- ☑ Real-time message alerts
- ☑ Task deadline reminders
- ☐ Daily digest

**Notification Frequency**:
- Instant: As events happen
- Daily Digest: Once per day
- Weekly Summary: Every Monday

### Security Settings

**Navigate to**: Account → Security

**Password Management**:
- Change your password regularly
- Use strong, unique passwords
- Enable password recovery email

**Two-Factor Authentication** (Recommended):
1. Go to Security settings
2. Click "Enable 2FA"
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes in secure location

**Active Sessions**:
- View currently logged-in devices
- Revoke access to old devices
- See login history

### Organization Settings

**Navigate to**: Account → Organization

View your organization details:

- **Organization Name**: Your company name
- **Billing Email**: Where invoices are sent
- **Organization Address**: Billing address
- **Primary Contact**: Main point of contact
- **Portal Tier**: Current access level

**Note**: Only organization administrators can edit these settings. Contact your service provider to update.

---

## Help & Support

### Help Center

**Navigate to**: Help → Knowledge Base

Search our help articles:

```
┌──────────────────────────────────────┐
│  [Search: How do I...]               │
├──────────────────────────────────────┤
│  📚 Getting Started                  │
│    • First login guide               │
│    • Portal navigation               │
│    • Profile setup                   │
│                                      │
│  💬 Conversations & Messaging        │
│    • How to send a message           │
│    • File attachments                │
│    • Notification settings           │
│                                      │
│  💰 Billing & Invoices               │
│    • Viewing invoices                │
│    • Making payments                 │
│    • Payment methods                 │
└──────────────────────────────────────┘
```

### Contacting Support

**Option 1: Start a Conversation**
- Navigate to: Messages → New Conversation
- Subject: "Support Request: [Your Issue]"
- Describe your issue in detail
- Attach screenshots if helpful

**Option 2: Email Support**
- Send email to: support@[your-provider].com
- Include your account email
- Describe the issue
- Response within 24 hours (business days)

**Option 3: Use AI Assistant**
- Ask: "How do I contact support?"
- AI will provide relevant help articles or escalate to human

### Providing Feedback

We value your feedback! Share suggestions:

**Navigate to**: Help → Send Feedback

Or click the feedback button on any page.

**Feedback Types**:
- Feature Request: Suggest new capabilities
- Bug Report: Report technical issues
- General Feedback: Share your experience

---

## Common Questions (FAQ)

### General

**Q: How do I know if I have access to a project?**
A: If you can see a project in your Projects list, you have access. Your service provider controls project access.

**Q: Why can't I see all tasks?**
A: You only see tasks marked as "visible to client." Internal tasks are hidden to avoid confusion.

**Q: Can I invite other team members from my company?**
A: Yes! Ask your service provider to send them an invitation. They'll be added to your organization.

**Q: How often is data updated?**
A: Real-time. Changes made by your service provider appear instantly.

### Tasks

**Q: Can I create my own tasks?**
A: Not directly. Request tasks through conversations or ask your service provider to add them.

**Q: How do I mark a task as complete?**
A: Only your service provider can update task status. Use the comment feature to confirm completion.

**Q: What does each task status mean?**
- **To Do**: Not started yet
- **In Progress**: Currently being worked on
- **Review**: Awaiting your review/approval
- **Completed**: Finished and approved
- **On Hold**: Temporarily paused

### Invoices & Payments

**Q: When are invoices due?**
A: Check the "Due Date" on each invoice. Typically 15-30 days from issue date.

**Q: What payment methods are accepted?**
A: Credit/debit cards, ACH transfers, and PayPal (if enabled by provider).

**Q: Can I set up automatic payments?**
A: Yes! Go to Billing → Payment Methods → Enable Auto-Pay.

**Q: I paid but it still shows unpaid. Why?**
A: Payments can take 1-3 business days to process. Contact support if it's been longer.

**Q: Can I download invoices?**
A: Yes. Click "View" on any invoice, then "Download PDF" in the top right.

### Files & Documents

**Q: How long are files stored?**
A: Indefinitely. Files remain accessible as long as your project is active.

**Q: Can I upload my own files?**
A: Yes, through conversations. Attach files to messages.

**Q: What's the file size limit?**
A: 10 MB per file for uploads. No limit on downloads.

**Q: Are files backed up?**
A: Yes. All files are backed up daily and stored securely.

### AI Assistant

**Q: Is the AI assistant always accurate?**
A: The AI provides helpful information based on your data, but always verify important details.

**Q: Can I use the AI in other languages?**
A: Currently English only. More languages coming soon.

**Q: Does the AI learn from my conversations?**
A: No. Each conversation is independent. Your data is not used to train the AI.

**Q: What if I hit my daily message limit?**
A: You can upgrade your tier for more messages, or wait until the limit resets at midnight UTC.

---

## Troubleshooting

### Login Issues

**Problem**: "Invalid email or password"
- ✓ Check for typos in email and password
- ✓ Passwords are case-sensitive
- ✓ Try "Forgot Password" to reset

**Problem**: "Account not activated"
- ✓ Check email for activation link
- ✓ Click the link to activate
- ✓ Request new activation email if expired

**Problem**: "Too many login attempts"
- ✓ Wait 15 minutes before trying again
- ✓ Use "Forgot Password" to reset
- ✓ Contact support if locked out

### Page Not Loading

**Problem**: Portal pages won't load
1. Refresh the page (Ctrl+R or Cmd+R)
2. Clear browser cache and cookies
3. Try a different browser
4. Check your internet connection
5. Contact support if issue persists

**Problem**: Files won't download
1. Check your popup blocker settings
2. Try right-click → "Save Link As"
3. Check available storage space
4. Try a different browser

### Notification Issues

**Problem**: Not receiving email notifications
- ✓ Check spam/junk folder
- ✓ Add noreply@[provider].com to contacts
- ✓ Verify email in Account → Profile
- ✓ Check Notification Preferences are enabled

**Problem**: Too many notifications
- ✓ Go to Account → Notifications
- ✓ Change frequency to Daily Digest
- ✓ Uncheck unnecessary notification types

### AI Assistant Issues

**Problem**: AI not responding
1. Check your internet connection
2. Refresh the page
3. Close and reopen the copilot
4. Check if you've hit daily message limit

**Problem**: AI gives irrelevant answers
- Be more specific in your questions
- Provide context (e.g., project name, date range)
- Try rephrasing your question
- Use the search feature instead

---

## Tips & Best Practices

### Efficient Portal Use

1. **Check Daily**: Log in daily to stay updated on project progress
2. **Enable Notifications**: Don't miss important messages or deadlines
3. **Use AI First**: Ask the AI assistant before searching manually
4. **Organize Conversations**: Use clear subject lines for new conversations
5. **Keep Profile Updated**: Ensure contact information is current

### Effective Communication

1. **Be Specific**: Provide context in messages (project name, task, etc.)
2. **Use Attachments**: Share visuals when describing feedback
3. **Tag Team Members**: Use @mentions for specific questions
4. **Set Priority**: Mark urgent messages appropriately
5. **Follow Up**: Check back on conversations for responses

### Project Management

1. **Review Tasks Weekly**: Check task list every Monday
2. **Track Milestones**: Watch for milestone completion notifications
3. **Monitor Timeline**: Review project timeline regularly
4. **Provide Feedback**: Comment on tasks to keep team informed
5. **Approve Promptly**: Review and approve deliverables quickly

### Financial Management

1. **Set Payment Reminders**: Use calendar for invoice due dates
2. **Enable Auto-Pay**: Avoid late payments with automatic billing
3. **Review Invoices**: Check line items for accuracy
4. **Track Spending**: Monitor monthly spend in invoice dashboard
5. **Save Receipts**: Download payment confirmations for records

---

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `P` | Go to Projects |
| `G` then `T` | Go to Tasks |
| `G` then `M` | Go to Messages |
| `G` then `B` | Go to Billing |
| `/` | Focus search bar |
| `?` | Show keyboard shortcuts |
| `Esc` | Close modal/dialog |

### Conversation Shortcuts

| Shortcut | Action |
|----------|--------|
| `C` | Compose new message |
| `R` | Reply to selected |
| `Ctrl+Enter` | Send message |
| `↑` `↓` | Navigate messages |
| `Enter` | Open selected |

### Task Shortcuts

| Shortcut | Action |
|----------|--------|
| `F` | Filter tasks |
| `S` | Sort tasks |
| `↑` `↓` | Navigate tasks |
| `Enter` | Open selected task |

---

## Mobile Access

### Mobile Web

Access the portal from any mobile browser:

1. Navigate to: `https://your-portal.synthstack.app`
2. Log in with your credentials
3. Portal automatically adapts to mobile screen

**Mobile Features**:
- ✅ View projects and tasks
- ✅ Send and receive messages
- ✅ View invoices
- ✅ Download files
- ✅ Use AI assistant
- ❌ Advanced file management
- ❌ Bulk operations

### Mobile App

*Coming Soon*: Native iOS and Android apps with:
- Push notifications
- Offline access to recent data
- Biometric authentication
- Enhanced file management

---

## Privacy & Security

### Data Protection

Your data is protected through:

- **Encryption**: All data encrypted in transit (TLS) and at rest (AES-256)
- **Access Control**: Role-based permissions ensure data isolation
- **Backups**: Daily automated backups with 30-day retention
- **Monitoring**: 24/7 security monitoring and threat detection

### Your Privacy Rights

You have the right to:

- **Access**: Request a copy of your data
- **Correction**: Update incorrect information
- **Deletion**: Request account and data deletion
- **Portability**: Export your data in standard format
- **Restriction**: Limit how your data is used

Contact your service provider to exercise these rights.

### Data Retention

- **Active Projects**: Data retained while project is active
- **Completed Projects**: Archived for 7 years (or per contract)
- **Deleted Accounts**: Data permanently deleted within 30 days
- **Invoices**: Retained per tax law requirements (typically 7 years)

### Compliance

The portal complies with:

- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- SOC 2 Type II
- PCI DSS (for payment processing)

---

## Glossary

**AI Copilot**: Artificial intelligence assistant that helps you navigate the portal and answer questions about your projects.

**Client-Visible**: Tasks or information specifically marked for client viewing (as opposed to internal team items).

**Conversation**: Message thread between you and your service provider, usually related to a specific project or topic.

**Milestone**: Significant checkpoint in a project timeline, often tied to deliverables or payments.

**Portal Tier**: Your access level determining features and usage limits (Community, Subscriber, Premium, Lifetime).

**Project Contact**: User linked to a specific project with defined permissions (view tasks, upload files, etc.).

**RAG Context**: Retrieval-Augmented Generation - how the AI assistant accesses your project data to answer questions.

**RLS**: Row-Level Security - database filtering that ensures you only see your own organization's data.

**Session**: Your active login period. Sessions expire after 24 hours of inactivity for security.

---

## Support Contacts

**Technical Support**:
- Email: support@[your-provider].com
- Portal: Messages → New Conversation
- Hours: Monday-Friday, 9am-5pm EST

**Billing Questions**:
- Email: billing@[your-provider].com
- Phone: (555) 123-4567
- Hours: Monday-Friday, 9am-5pm EST

**Emergency Contact** (Critical Issues):
- Phone: (555) 123-4568
- Available 24/7 for premium/lifetime tiers

---

## Version Information

**Portal Version**: 2.0.0
**Last Updated**: January 2026
**Guide Version**: 1.0

For the latest version of this guide, visit: Help → User Guide

---

**Need more help?** Contact support or use the AI assistant for instant answers.
