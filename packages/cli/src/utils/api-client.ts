/**
 * HTTP client for the CherryTree REST API.
 *
 * @example
 *   const api = createApiClient(token, baseUrl);
 *   const outlines = await api.outlines.list();
 *
 * @consumers commands/
 * @depends utils/config.ts
 */

import type { ApiResponse, Node, Outline, User } from '@cherrytree/shared';

type ExportFormat = 'json' | 'md';

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(token: string, baseUrl: string) {
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    const body = (await res.json()) as ApiResponse<T>;
    if (!res.ok && !body.error) {
      return {
        data: null,
        error: { code: 'UNKNOWN', message: res.statusText },
      };
    }
    return body;
  }

  return {
    auth: {
      login: (email: string, password: string) =>
        request<{ user: User; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }),
      register: (email: string, username: string, password: string) =>
        request<{ user: User; token: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, username, password }),
        }),
      logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    },

    outlines: {
      list: () => request<Outline[]>('/api/outlines'),
      get: (id: string) => request<Outline>(`/api/outlines/${id}`),
      create: (title?: string) =>
        request<Outline>('/api/outlines', {
          method: 'POST',
          body: JSON.stringify({ title }),
        }),
      update: (id: string, title: string) =>
        request<Outline>(`/api/outlines/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title }),
        }),
      delete: (id: string) =>
        request<{ deleted: boolean }>(`/api/outlines/${id}`, { method: 'DELETE' }),
    },

    nodes: {
      tree: (outlineId: string) =>
        request<Node[]>(`/api/outlines/${outlineId}/tree`),
      get: (outlineId: string, nodeId: string) =>
        request<Node & { children: Node[] }>(
          `/api/outlines/${outlineId}/nodes/${nodeId}`,
        ),
      create: (
        outlineId: string,
        content: string,
        parentId?: string | null,
        position?: number,
      ) =>
        request<Node>(`/api/outlines/${outlineId}/nodes`, {
          method: 'POST',
          body: JSON.stringify({
            content,
            parent_id: parentId,
            position,
          }),
        }),
      update: (
        outlineId: string,
        nodeId: string,
        changes: { content?: string; is_completed?: boolean; is_collapsed?: boolean },
      ) =>
        request<Node>(`/api/outlines/${outlineId}/nodes/${nodeId}`, {
          method: 'PATCH',
          body: JSON.stringify(changes),
        }),
      delete: (outlineId: string, nodeId: string) =>
        request<{ deleted: boolean }>(
          `/api/outlines/${outlineId}/nodes/${nodeId}`,
          { method: 'DELETE' },
        ),
      move: (
        outlineId: string,
        nodeId: string,
        parentId: string | null,
        position: number,
      ) =>
        request<Node>(
          `/api/outlines/${outlineId}/nodes/${nodeId}/move`,
          {
            method: 'POST',
            body: JSON.stringify({ parent_id: parentId, position }),
          },
        ),
      search: (outlineId: string, query: string) =>
        request<Node[]>(`/api/outlines/${outlineId}/search?q=${encodeURIComponent(query)}`),
      export: (outlineId: string, format: ExportFormat) =>
        request<unknown>(
          `/api/outlines/${outlineId}/export?format=${format}`,
        ),
    },

    tokens: {
      list: () => request<unknown[]>('/api/tokens'),
      create: (name: string, expiresInDays?: number) =>
        request<{ id: string; name: string; token: string; token_prefix: string }>(
          '/api/tokens',
          {
            method: 'POST',
            body: JSON.stringify({ name, expires_in_days: expiresInDays }),
          },
        ),
      revoke: (id: string) =>
        request<{ deleted: boolean }>(`/api/tokens/${id}`, { method: 'DELETE' }),
    },
  };
}
