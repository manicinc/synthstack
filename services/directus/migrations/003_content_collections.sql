-- SynthStack Content Collections Migration
-- Blog posts, careers, FAQ, company pages, newsletter, contact

-- Blog Categories
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7)
);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

-- Blog Authors
CREATE TABLE IF NOT EXISTS blog_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT,
  avatar UUID REFERENCES directus_files(id),
  email VARCHAR(255),
  social_links JSONB
);
CREATE INDEX IF NOT EXISTS idx_blog_authors_slug ON blog_authors(slug);

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'draft',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  summary TEXT,
  body TEXT NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES blog_authors(id) ON DELETE SET NULL,
  hero_image UUID REFERENCES directus_files(id),
  og_image UUID REFERENCES directus_files(id),
  published_at TIMESTAMP WITH TIME ZONE,
  read_time INT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  views INT DEFAULT 0,
  likes INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);

-- Career Openings
CREATE TABLE IF NOT EXISTS career_openings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'draft',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  department VARCHAR(100),
  location VARCHAR(255),
  employment_type VARCHAR(50),
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  salary_min INT,
  salary_max INT,
  currency VARCHAR(3) DEFAULT 'USD',
  posted_at TIMESTAMP WITH TIME ZONE,
  closes_at TIMESTAMP WITH TIME ZONE,
  seo_title VARCHAR(255),
  seo_description TEXT
);
CREATE INDEX IF NOT EXISTS idx_career_openings_slug ON career_openings(slug);
CREATE INDEX IF NOT EXISTS idx_career_openings_status ON career_openings(status);
CREATE INDEX IF NOT EXISTS idx_career_openings_department ON career_openings(department);

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'pending',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  career_opening_id UUID REFERENCES career_openings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  cover_letter TEXT,
  resume UUID REFERENCES directus_files(id),
  portfolio_file UUID REFERENCES directus_files(id),
  notes TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  reviewed_by UUID REFERENCES directus_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_job_applications_career ON job_applications(career_opening_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);

-- FAQ Items
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  seo_keywords TEXT[]
);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_items_status ON faq_items(status);

-- Company Pages
CREATE TABLE IF NOT EXISTS company_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'published',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  hero_image UUID REFERENCES directus_files(id),
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[]
);
CREATE INDEX IF NOT EXISTS idx_company_pages_slug ON company_pages(slug);

-- Newsletter Signups
CREATE TABLE IF NOT EXISTS newsletter_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'active',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  source VARCHAR(100),
  synced_to_provider BOOLEAN DEFAULT FALSE,
  provider_id VARCHAR(255),
  synced_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  unsubscribed BOOLEAN DEFAULT FALSE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_newsletter_signups_email ON newsletter_signups(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_signups_synced ON newsletter_signups(synced_to_provider);

-- Contact Submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'new',
  sort INT,
  user_created UUID REFERENCES directus_users(id),
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_updated UUID REFERENCES directus_users(id),
  date_updated TIMESTAMP WITH TIME ZONE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  notes TEXT,
  replied BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID REFERENCES directus_users(id)
);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_date ON contact_submissions(date_created);
