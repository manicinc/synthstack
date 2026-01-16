const NEWSLETTER_PROVIDER = process.env.NEWSLETTER_PROVIDER || 'mailerlite';
const NEWSLETTER_API_KEY = process.env.NEWSLETTER_API_KEY;
const NEWSLETTER_LIST_ID = process.env.NEWSLETTER_LIST_ID;

export async function syncToNewsletterProvider(email: string, name?: string) {
  if (!NEWSLETTER_API_KEY || !NEWSLETTER_LIST_ID) {
    console.warn('Newsletter provider not configured');
    return { success: false, reason: 'not_configured' };
  }

  try {
    if (NEWSLETTER_PROVIDER === 'mailerlite') {
      return await syncToMailerLite(email, name);
    } else if (NEWSLETTER_PROVIDER === 'mailchimp') {
      return await syncToMailchimp(email, name);
    }
    return { success: false, reason: 'unknown_provider' };
  } catch (error) {
    console.error('Newsletter sync error:', error);
    return { success: false, error };
  }
}

async function syncToMailerLite(email: string, name?: string) {
  const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NEWSLETTER_API_KEY}`,
    },
    body: JSON.stringify({
      email,
      fields: name ? { name } : {},
      groups: [NEWSLETTER_LIST_ID],
    }),
  });

  if (!response.ok) {
    throw new Error(`MailerLite API error: ${response.statusText}`);
  }

  const data = await response.json();
  return { success: true, provider_id: data.data.id };
}

async function syncToMailchimp(email: string, name?: string) {
  const [firstName, ...lastNameParts] = (name || '').split(' ');
  const lastName = lastNameParts.join(' ');

  const response = await fetch(
    `https://us1.api.mailchimp.com/3.0/lists/${NEWSLETTER_LIST_ID}/members`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`anystring:${NEWSLETTER_API_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        merge_fields: {
          FNAME: firstName || '',
          LNAME: lastName || '',
        },
      }),
    }
  );

  if (!response.ok && response.status !== 400) {
    throw new Error(`Mailchimp API error: ${response.statusText}`);
  }

  const data = await response.json();
  return { success: true, provider_id: data.id };
}
