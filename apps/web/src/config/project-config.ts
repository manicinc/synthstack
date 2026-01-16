import rawConfigString from '../../../../config.json?raw'

const rawConfig = JSON.parse(rawConfigString)

export interface ProjectConfig {
  app: {
    name: string
    tagline: string
    description: string
    fullDescription: string
    domain: string
    version?: string
  }
  branding: {
    logo: {
      light: string
      dark: string
      mark: string
      markDark: string
    }
    favicon: {
      default: string
      dark: string
      apple: string
    }
    colors: {
      primary: string
      accent: string
      theme: string
      background: string
    }
    og: {
      image: string
      type: string
    }
  }
  company: {
    name: string
    legalName?: string | null
    founded?: string | null
    location?: string | null
  }
  contact: {
    support: string
    sales: string
    general: string
    noreply?: string
  }
  social: {
    github?: string | null
    twitter?: string | null
    discord?: string | null
    linkedin?: string | null
    youtube?: string | null
  }
  links: {
    docs: string
    changelog?: string
    roadmap?: string
    status?: string | null
  }
  legal: {
    privacy: string
    terms: string
    cookies: string
    security: string
    gdpr: string
  }
  demo: {
    enabled: boolean
    email: string
    password: string
  }
  infrastructure: {
    containerPrefix: string
    networkName: string
    databaseName: string
    subdomains: Record<string, string>
    ports: Record<string, number>
  }
  github: {
    orgName: string
    proRepoName: string
    communityRepoName: string
    teamSlug?: string
  }
  features: {
    copilot: boolean
    referrals: boolean
    analytics: boolean
    i18n: boolean
  }
}

export const projectConfig = rawConfig as unknown as ProjectConfig

export default projectConfig
