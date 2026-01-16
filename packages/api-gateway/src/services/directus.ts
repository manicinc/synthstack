import { config } from '../config/index.js';

// Simple Directus client using fetch
class DirectusClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async request(method: string, path: string, body?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Directus API error: ${response.status}`);
    }

    return response.json();
  }

  items(collection: string) {
    return {
      createOne: async (data: any) => {
        const result = await this.request('POST', `/items/${collection}`, data);
        return result.data;
      },
      readOne: async (id: string) => {
        const result = await this.request('GET', `/items/${collection}/${id}`);
        return result.data;
      },
      readByQuery: async (query: { filter?: any; sort?: string[]; limit?: number; offset?: number; aggregate?: any; fields?: string[] }) => {
        const params = new URLSearchParams();
        if (query.filter) params.set('filter', JSON.stringify(query.filter));
        if (query.sort) params.set('sort', query.sort.join(','));
        if (query.limit) params.set('limit', String(query.limit));
        if (query.offset) params.set('offset', String(query.offset));
        if (query.aggregate) params.set('aggregate', JSON.stringify(query.aggregate));
        if (query.fields) params.set('fields', query.fields.join(','));
        const result = await this.request('GET', `/items/${collection}?${params}`);
        return { data: result.data };
      },
      updateOne: async (id: string, data: any) => {
        const result = await this.request('PATCH', `/items/${collection}/${id}`, data);
        return result.data;
      },
      deleteOne: async (id: string) => {
        await this.request('DELETE', `/items/${collection}/${id}`);
        return true;
      },
      deleteMany: async (ids: string[]) => {
        await this.request('DELETE', `/items/${collection}`, ids);
        return true;
      },
    };
  }
}

export const directus = new DirectusClient(
  config.directusUrl,
  config.directusToken || ''
);

// Alias for backwards compatibility
export const directusClient = directus;

// Helper to check if Directus is available
export async function checkDirectusHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.directusUrl}/server/health`);
    return response.ok;
  } catch {
    return false;
  }
}
