/**
 * i18n Type Definitions
 */

export interface LocaleDefinition {
  /** ISO locale code: 'en-US', 'es', 'zh-CN' */
  code: string;
  /** Native name: 'English', 'Español', '中文' */
  name: string;
  /** English name for fallback display */
  englishName: string;
  /** Flag emoji or icon identifier */
  flag: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Quasar lang pack name */
  quasarLang: string;
  /** date-fns format pattern */
  dateFormat: string;
  /** Whether this locale is enabled */
  enabled: boolean;
}

export interface LocaleMessages {
  app: {
    name: string;
    tagline: string;
  };
  nav: {
    home: string;
    features: string;
    pricing: string;
    dashboard: string;
    generate: string;
    printers: string;
    filaments: string;
    profiles: string;
    myProfiles: string;
    history: string;
    account: string;
    subscription: string;
    login: string;
    signup: string;
    logout: string;
  };
  landing: {
    hero: {
      title: string;
      subtitle: string;
      cta: string;
      secondaryCta: string;
    };
    features: {
      title: string;
      subtitle: string;
      stlAnalysis: {
        title: string;
        description: string;
      };
      aiSettings: {
        title: string;
        description: string;
      };
      multiSlicer: {
        title: string;
        description: string;
      };
      community: {
        title: string;
        description: string;
      };
    };
    howItWorks: {
      title: string;
      step1: {
        title: string;
        description: string;
      };
      step2: {
        title: string;
        description: string;
      };
      step3: {
        title: string;
        description: string;
      };
      step4: {
        title: string;
        description: string;
      };
    };
    stats: {
      profiles: string;
      printers: string;
      successRate: string;
    };
    cta: {
      title: string;
      subtitle: string;
      primary: string;
      secondary: string;
      note: string;
    };
  };
  auth: {
    login: {
      title: string;
      subtitle: string;
      email: string;
      password: string;
      submit: string;
      forgotPassword: string;
      noAccount: string;
      signUp: string;
    };
    register: {
      title: string;
      subtitle: string;
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
      submit: string;
      hasAccount: string;
      signIn: string;
    };
    forgotPassword: {
      title: string;
      subtitle: string;
      email: string;
      submit: string;
      backToLogin: string;
    };
    social: {
      or: string;
      google: string;
      github: string;
    };
  };
  dashboard: {
    welcome: string;
    credits: {
      title: string;
      remaining: string;
      usedToday: string;
      unlimited: string;
    };
    quickActions: {
      title: string;
      newGeneration: string;
      browsePrinters: string;
      viewProfiles: string;
    };
    recentGenerations: {
      title: string;
      empty: string;
    };
  };
  generate: {
    title: string;
    upload: {
      title: string;
      dragDrop: string;
      or: string;
      browse: string;
      maxSize: string;
    };
    analysis: {
      title: string;
      dimensions: string;
      volume: string;
      faces: string;
      overhangs: string;
      thinWalls: string;
      difficulty: string;
    };
    settings: {
      title: string;
      printer: string;
      filament: string;
      quality: string;
      priorities: string;
      speed: string;
      strength: string;
      material: string;
    };
    result: {
      title: string;
      confidence: string;
      export: string;
      save: string;
      regenerate: string;
    };
  };
  pricing: {
    title: string;
    subtitle: string;
    monthly: string;
    annually: string;
    savePercent: string;
    loading: string;
    error: string;
    cta: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    download: string;
    share: string;
    copy: string;
    copied: string;
    search: string;
    filter: string;
    sort: string;
    all: string;
    none: string;
  };
  errors: {
    notFound: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
  };
  // Language switcher
  language: {
    select: string;
    current: string;
  };
}
