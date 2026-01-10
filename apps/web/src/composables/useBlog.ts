import { ref } from 'vue';
import { api } from '@/services/api';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body?: string;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  category_color?: string;
  author_id?: string;
  author_name?: string;
  published_at?: string;
  read_time?: number;
  featured?: boolean;
  image?: string;
  og_image?: string;
  seo_title?: string;
  seo_description?: string;
  views?: number;
}

export function useBlog() {
  const posts = ref<BlogPost[]>([]);
  const categories = ref<BlogCategory[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPosts(options?: { category?: string; featured?: boolean; limit?: number }) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.featured) params.append('featured', 'true');
      if (options?.limit) params.append('limit', options.limit.toString());

      const queryString = params.toString();
      const url = queryString ? `/api/v1/blog?${queryString}` : '/api/v1/blog';
      const response = await api.get(url);
      posts.value = response.data || [];
      return posts.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to load blog posts';
      logError('Error fetching blog posts:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchPost(slug: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await api.get(`/api/v1/blog/${slug}`);
      return response.data;
    } catch (err: any) {
      error.value = err.message || 'Failed to load blog post';
      logError('Error fetching blog post:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCategories() {
    try {
      const response = await api.get('/api/v1/blog/categories');
      categories.value = response.data || [];
      return categories.value;
    } catch (err: any) {
      logError('Error fetching blog categories:', err);
      return [];
    }
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return {
    posts,
    categories,
    loading,
    error,
    fetchPosts,
    fetchPost,
    fetchCategories,
    formatDate,
  };
}
