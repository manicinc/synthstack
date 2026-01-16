# Environment Configuration

## Quick Start

```bash
# Copy the example file
cp .env.example .env

# Fill in your real credentials
nano .env  # or use your preferred editor

# Start development
pnpm dev
```

## File Structure

```
.
├── .env.example    # Template with placeholders (in git) ✅
└── .env            # Your config with real values (gitignored) 🔒
```

**Legend:**
- ✅ = Committed to git (safe, has placeholders)
- 🔒 = Gitignored (contains real credentials)

## Required Environment Variables

At minimum, you need:

1. **Database**: PostgreSQL connection string
2. **Directus**: Admin credentials and secret keys
3. **Stripe**: API keys (for payments)
4. **Email**: SMTP or Resend credentials

See `.env.example` for all available options with descriptions.

## Optional AI Features

To enable AI features, add API keys for:

- **OpenAI**: `OPENAI_API_KEY`
- **Anthropic**: `ANTHROPIC_API_KEY`
- **Google AI**: `GOOGLE_AI_API_KEY`

At least one AI API key is required for AI-powered features.
