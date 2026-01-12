# Newsletter Setup Guide

Set up your email newsletter with **EmailOctopus** - a developer-friendly, static-hosting compatible newsletter service.

---

## Why EmailOctopus?

| Feature | Benefit |
|---------|---------|
| **Static Hosting Compatible** | Works on GitHub Pages, Netlify, Vercel - no server needed |
| **Free Tier** | 2,500 contacts + 10,000 emails/month free forever |
| **Simple Embed** | One-line JavaScript embed - no framework dependencies |
| **GDPR Compliant** | Built-in consent checkbox and double opt-in |
| **API Access** | Full REST API for programmatic subscribers |

> 💡 **Cost Savings**: You won't pay for newsletters until you exceed 2,500 subscribers. That's enough for most early-stage SaaS products!

---

## Pricing Breakdown

| Tier | Contacts | Emails/Month | Price |
|------|----------|--------------|-------|
| **Starter (Free)** | 2,500 | 10,000 | $0/mo |
| Pro 5k | 5,000 | 50,000 | $16/mo |
| Pro 10k | 10,000 | 100,000 | $24/mo |
| Pro 25k | 25,000 | 250,000 | $50/mo |
| Pro 50k | 50,000 | 500,000 | $80/mo |

**Free tier includes:**
- ✅ Landing pages (3)
- ✅ Signup forms (3)
- ✅ Email automations (3 with 5 steps each)
- ⚠️ EmailOctopus branding on emails
- ⚠️ 30-day report retention

---

## Quick Setup (5 minutes)

### 1. Create EmailOctopus Account

1. Sign up at [emailoctopus.com](https://emailoctopus.com)
2. Verify your email
3. Create your first list (e.g., "SynthStack Newsletter")

### 2. Get Your Form Embed Code

1. Go to **Lists** → Select your list → **Forms**
2. Click **Create form** or use the default
3. Configure form settings:
   - ✅ Include consent checkbox
   - ✅ Enable reCAPTCHA bot protection
   - Set success message: "Thanks for subscribing! 🎉"
4. Copy the embed script

### 3. Add to Your Landing Page

Add this script where you want the form to appear:

```html
<script async src="https://eomail5.com/form/YOUR_FORM_ID.js" data-form="YOUR_FORM_ID"></script>
```

**SynthStack default (Manic Agency list):**
```html
<script async src="https://eomail5.com/form/9262a386-6ef3-11f0-bd78-dff98cfe1a02.js" data-form="9262a386-6ef3-11f0-bd78-dff98cfe1a02"></script>
```

---

## Environment Variables

Add to your `.env` file:

```bash
# EmailOctopus (Newsletter)
EMAILOCTOPUS_API_KEY=your-api-key-here
EMAILOCTOPUS_LIST_ID=5679617a-6ef3-11f0-83af-a72ac847aedc
VITE_EMAILOCTOPUS_FORM_ID=9262a386-6ef3-11f0-bd78-dff98cfe1a02
```

**Get your API key:** EmailOctopus → Settings → API Keys → Create key

---

## API Integration (Optional)

For programmatic subscriber management:

```typescript
// services/newsletter.ts
const EMAILOCTOPUS_API_URL = 'https://emailoctopus.com/api/1.6';

export async function addSubscriber(email: string, firstName?: string) {
  const response = await fetch(
    `${EMAILOCTOPUS_API_URL}/lists/${process.env.EMAILOCTOPUS_LIST_ID}/contacts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.EMAILOCTOPUS_API_KEY,
        email_address: email,
        fields: { FirstName: firstName || '' },
        status: 'SUBSCRIBED', // or 'PENDING' for double opt-in
      }),
    }
  );
  return response.json();
}
```

---

## Swapping Newsletter Providers

SynthStack uses environment-based configuration, making it easy to swap providers:

1. **EmailOctopus** (default) - Best free tier
2. **Buttondown** - Developer-focused, markdown newsletters  
3. **ConvertKit** - Advanced automations for creators
4. **Loops** - SaaS-focused, native Resend integration

To swap, update the form embed in your landing page and environment variables.

---

## GDPR Compliance

EmailOctopus handles GDPR for you with:

1. **Consent Checkbox** - Enable in form settings
2. **Double Opt-in** - Send confirmation email before subscribing
3. **Unsubscribe Links** - Automatic in every email
4. **Data Export** - Export subscriber data on request
5. **Data Deletion** - Delete subscribers via API or dashboard

**Your cookie banner** (already implemented) should mention:
> "We use cookies to remember your preferences and deliver marketing emails if you subscribe to our newsletter."

---

## Finding Your EmailOctopus IDs

| ID | Where to Find |
|----|---------------|
| **List ID** | Lists → (select list) → Settings → List ID |
| **Form ID** | Lists → (select list) → Forms → (select form) → in embed code |
| **API Key** | Settings → Integrations → API Keys |

---

## Troubleshooting

### Form not showing
- Check browser console for script errors
- Verify form ID matches your embed code
- Ensure no CSP blocking external scripts

### Subscribers not appearing
- Check spam folder for double opt-in email
- Verify API key has write permissions
- Check EmailOctopus dashboard for failed subscriptions

### reCAPTCHA issues
- Add `emailoctopus.com` and `google.com` to CSP if needed
- Test in incognito to rule out extension conflicts

---

## Related Documentation

- [Resend Transactional Emails](../EMAIL_SERVICE.md) - App emails (welcome, receipts)
- [Cookie Policy](https://synthstack.app/cookies) - GDPR cookie consent
- [Privacy Policy](https://synthstack.app/privacy) - Data handling

---

**Questions?** Contact [team@manic.agency](mailto:team@manic.agency)
