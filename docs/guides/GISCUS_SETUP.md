# Setting Up Giscus Comments

SynthStack supports [Giscus](https://giscus.app) for blog post comments, powered by GitHub Discussions. This provides a free, privacy-friendly commenting system that doesn't require a separate database.

## Features

- **GitHub-powered**: Comments are stored as GitHub Discussions
- **No database required**: All data lives in your GitHub repository
- **Theme sync**: Automatically matches your app's dark/light mode
- **Reactions**: Supports GitHub-style emoji reactions
- **Moderation**: Use GitHub's built-in moderation tools

## Prerequisites

- A **public** GitHub repository (or a separate public repo for discussions if your main repo is private)
- GitHub Discussions enabled on the repository
- Admin access to the repository

> **Private Repo?** If your main repository is private, create a dedicated public repo just for discussions (e.g., `your-org/your-project-discussions`). This keeps your code private while allowing public comments.

## Setup Steps

### 1. Enable GitHub Discussions

1. Go to your repository on GitHub
2. Click **Settings** → **General**
3. Scroll to **Features** section
4. Check **Discussions**

### 2. Create Discussion Categories

1. Go to the **Discussions** tab in your repository
2. Click the gear icon (⚙️) next to "Categories" to manage them
3. Click **New category**
4. Create categories for your editions:
   - **Pro Blog** - for synthstack-pro edition
   - **Community Blog** - for synthstack-community/lite edition
5. Set the format to **Announcement** (only maintainers can create, others can reply)
6. Optionally delete the default categories (General, Ideas, etc.) if not needed

### 3. Install the Giscus GitHub App

> **Important:** This step is required before giscus.app can detect your repository and categories.

1. Go to [github.com/apps/giscus](https://github.com/apps/giscus)
2. Click **Install**
3. Select your organization or personal account
4. Choose **Only select repositories**
5. Select your discussions repository (e.g., `your-org/your-project-discussions`)
6. Click **Install**

### 4. Configure Giscus

1. Visit [giscus.app](https://giscus.app)
2. Enter your repository name (e.g., `manicinc/synthstack-discussions`)
3. If configured correctly, you'll see ✅ "All criteria have been met!"
4. Select your discussion category:
   - Choose **Pro Blog** for synthstack-pro
   - Choose **Community Blog** for synthstack-community/lite
5. Choose mapping preference (recommend **pathname**)
6. Copy the generated configuration values:
   - `data-repo` → `VITE_GISCUS_REPO`
   - `data-repo-id` → `VITE_GISCUS_REPO_ID`
   - `data-category` → `VITE_GISCUS_CATEGORY`
   - `data-category-id` → `VITE_GISCUS_CATEGORY_ID`

### 5. Add Environment Variables

Add to your `.env` file (or use the Environment Setup Wizard at `/setup/env`):

**For synthstack-pro (.env.pro):**
```env
# Giscus Comments
VITE_GISCUS_REPO=manicinc/synthstack-discussions
VITE_GISCUS_REPO_ID=R_kgDOQ6tKzg
VITE_GISCUS_CATEGORY=Pro Blog
VITE_GISCUS_CATEGORY_ID=DIC_kwDOQ6tKzs4C1Ajg
VITE_GISCUS_MAPPING=pathname
VITE_GISCUS_LANG=en
```

**For synthstack-community/lite (.env.lite):**
```env
# Giscus Comments
VITE_GISCUS_REPO=manicinc/synthstack-discussions
VITE_GISCUS_REPO_ID=R_kgDOQ6tKzg
VITE_GISCUS_CATEGORY=Community Blog
VITE_GISCUS_CATEGORY_ID=DIC_kwDOQ6tKzs4C1Ajn
VITE_GISCUS_MAPPING=pathname
VITE_GISCUS_LANG=en
```

> **Note:** The `REPO_ID` is the same for both editions (it's the discussions repo ID). The `CATEGORY_ID` will be different for Pro Blog vs Community Blog.

### 6. Verify Setup

1. Restart your development server
2. Navigate to any blog post
3. Scroll to the bottom to see the comments section
4. Sign in with GitHub to test posting a comment

## Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_GISCUS_REPO` | GitHub repo (owner/name) | - | Yes |
| `VITE_GISCUS_REPO_ID` | Repository ID from giscus.app | - | Yes |
| `VITE_GISCUS_CATEGORY` | Discussion category name | General | No |
| `VITE_GISCUS_CATEGORY_ID` | Category ID from giscus.app | - | Yes |
| `VITE_GISCUS_MAPPING` | How to map pages to discussions | pathname | No |
| `VITE_GISCUS_LANG` | Language code | en | No |

### Mapping Options

- `pathname` (recommended) - Uses page path (e.g., `/blog/my-post`)
- `url` - Uses full URL
- `title` - Uses page title
- `og:title` - Uses Open Graph title
- `specific` - Uses a specific term you define
- `number` - Uses a specific discussion number

## Using the Environment Setup Wizard

You can also configure Giscus using the built-in wizard:

1. Navigate to `/setup/env` in your app
2. Go to Step 6 (Integrations)
3. Scroll to the "Giscus Comments" section
4. Fill in the values from giscus.app
5. Export your `.env` file

## Troubleshooting

### giscus.app says "No categories found" or "Could not find discussions"

1. **Install the Giscus GitHub App**: Go to [github.com/apps/giscus](https://github.com/apps/giscus) and install it on your discussions repo
2. **Wait a moment**: After installing, refresh giscus.app - it may take a few seconds to detect your repo
3. **Check repo is public**: Giscus only works with public repositories

### Comments not appearing on blog posts?

1. **Check environment variables**: All three required variables must be set (`VITE_GISCUS_REPO`, `VITE_GISCUS_REPO_ID`, `VITE_GISCUS_CATEGORY_ID`)
2. **Repository must be public**: Giscus only works with public repositories
3. **Discussions must be enabled**: Verify in repository Settings → Features
4. **Giscus app must be installed**: Check at github.com/apps/giscus
5. **Check browser console**: Look for any JavaScript errors

### Theme not syncing?

The component automatically syncs with your app's dark/light mode via the theme store. If it's not working:

1. Ensure you're using the default theme system
2. Check that the iframe loads correctly
3. The theme update uses `postMessage` API - ensure no CSP issues

### Comments showing on wrong page?

If comments from one blog post appear on another:

1. Check your `VITE_GISCUS_MAPPING` setting
2. `pathname` mapping uses the URL path - ensure blog posts have unique paths
3. Consider using `url` mapping if paths might conflict

### Rate limiting?

GitHub API has rate limits. If you see issues:

1. Comments may take a moment to load
2. Users must sign in with GitHub to comment
3. Consider enabling lazy loading for comment sections

## Security Considerations

- **Public discussions**: All comments are visible in your GitHub repository
- **GitHub authentication**: Users must have GitHub accounts to comment
- **Moderation**: Use GitHub's discussion moderation features
- **CSP**: Ensure `giscus.app` is allowed in your Content Security Policy

## Related Guides

- [Newsletter Setup](./NEWSLETTER_SETUP.md)
- [Sentry Setup](./SENTRY_SETUP.md)
- [OAuth Setup](./OAUTH_SETUP.md)
