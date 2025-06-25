import createClient from 'openapi-fetch';
import type { paths } from './schema';

const baseUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://api.tabme.app' // Update with your production URL

// Create the API client with proper typing
const client = createClient<paths>({ baseUrl });

// Helper function to set the auth token
export function setAuthToken(token: string) {
  client.use({
    onRequest({ request }) {
      request.headers.set('Authorization', `Bearer ${token}`);
    },
  });
}

// Helper function to remove auth token
export function clearAuthToken() {
  // Create a new client instance without auth
  Object.assign(client, createClient<paths>({ baseUrl }));
}

// Authentication endpoints
export const auth = {
  async login(email: string, password: string) {
    const { data, error } = await client.POST('/api/auth/login', {
      body: {
        email,
        password,
      },
    });

    if (error) {
      throw new Error('Login failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async register(email: string, password: string, name?: string) {
    const { data, error } = await client.POST('/api/auth/register', {
      body: {
        email,
        password,
        name,
      },
    });

    if (error) {
      throw new Error('Registration failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async logout() {
    const { data, error } = await client.POST('/api/auth/logout');

    if (error) {
      throw new Error('Logout failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async getMe() {
    const { data, error } = await client.GET('/api/auth/me');

    if (error) {
      throw new Error('Get user failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async refreshToken() {
    const { data, error } = await client.POST('/api/auth/refresh-token');

    if (error) {
      throw new Error('Token refresh failed: ' + (error || 'Unknown error'));
    }

    return data;
  },
};

// Spaces endpoints
export const spaces = {
  async getAll() {
    const { data, error } = await client.GET('/api/spaces');

    if (error) {
      throw new Error('Get spaces failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async getById(spaceId: string) {
    const { data, error } = await client.GET('/api/spaces/{spaceId}', {
      params: {
        path: { spaceId },
      },
    });

    if (error) {
      throw new Error('Get space failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async create(title: string, position: string) {
    const { data, error } = await client.POST('/api/spaces', {
      body: {
        title,
        position,
      },
    });

    if (error) {
      throw new Error('Create space failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async update(spaceId: string, updates: { title?: string }) {
    const { data, error } = await client.PUT('/api/spaces/{spaceId}', {
      params: {
        path: { spaceId },
      },
      body: updates,
    });

    if (error) {
      throw new Error('Update space failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async delete(spaceId: string) {
    const { data, error } = await client.DELETE('/api/spaces/{spaceId}', {
      params: {
        path: { spaceId },
      },
    });

    if (error) {
      throw new Error('Delete space failed: ' + (error || 'Unknown error'));
    }

    return data;
  },
};

// Sync endpoints
export const sync = {
  async getFullData() {
    const { data, error } = await client.GET('/api/sync/full');

    if (error) {
      throw new Error('Get full sync data failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async getChanges(lastSyncVersion?: number, entityTypes?: string[]) {
    const params = new URLSearchParams();
    if (lastSyncVersion !== undefined) {
      params.append('lastSyncVersion', lastSyncVersion.toString());
    }
    if (entityTypes && entityTypes.length > 0) {
      params.append('entityTypes', entityTypes.join(','));
    }

    const { data, error } = await client.GET('/api/sync/changes', {
      params: {
        query: Object.fromEntries(params),
      },
    });

    if (error) {
      throw new Error('Get sync changes failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async applyChanges(changes: any[]) {
    const { data, error } = await client.POST('/api/sync/apply', {
      body: {
        changes,
      },
    });

    if (error) {
      throw new Error('Apply sync changes failed: ' + (error || 'Unknown error'));
    }

    return data;
  },

  async getStats() {
    const { data, error } = await client.GET('/api/sync/stats');

    if (error) {
      throw new Error('Get sync stats failed: ' + (error || 'Unknown error'));
    }

    return data;
  },
};

// Export the raw client for advanced usage
export { client };

// Export default client
export default client;
