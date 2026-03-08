/**
 * Typed fetch wrapper for the CherryTree API.
 *
 * @example
 *   import { api } from '../api/client';
 *   const outlines = await api.outlines.list();
 *
 * @consumers context/, hooks/
 * @depends @cherrytree/shared
 */

import type { ApiResponse, Node, Outline, User } from '@cherrytree/shared';

let authToken: string | null = localStorage.getItem('cherrytree_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('cherrytree_token', token);
  } else {
    localStorage.removeItem('cherrytree_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(path, { ...options, headers });
  const body = (await res.json()) as ApiResponse<T>;

  if (!res.ok && !body.error) {
    return { data: null, error: { code: 'UNKNOWN', message: res.statusText } };
  }

  return body;
}

type AuthData = {
  user: Pick<User, 'id' | 'email' | 'username'>;
  token: string;
};
type TokenData = { token: string };

export const api = {
  auth: {
    register(email: string, username: string, password: string) {
      return request<AuthData>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      });
    },
    login(email: string, password: string) {
      return request<TokenData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    logout() {
      return request<{ message: string }>('/auth/logout', { method: 'POST' });
    },
  },

  outlines: {
    list() {
      return request<Outline[]>('/api/outlines');
    },
    get(id: string) {
      return request<Outline>(`/api/outlines/${id}`);
    },
    create(title?: string) {
      return request<Outline>('/api/outlines', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    },
    delete(id: string) {
      return request<{ deleted: true }>(`/api/outlines/${id}`, {
        method: 'DELETE',
      });
    },
  },

  nodes: {
    getTree(outlineId: string) {
      return request<Node[]>(`/api/outlines/${outlineId}/tree`);
    },
    get(outlineId: string, nodeId: string) {
      return request<Node & { children: Node[] }>(
        `/api/outlines/${outlineId}/nodes/${nodeId}`,
      );
    },
    create(
      outlineId: string,
      content: string,
      parentId: string | null,
      position?: number,
    ) {
      return request<Node>(`/api/outlines/${outlineId}/nodes`, {
        method: 'POST',
        body: JSON.stringify({ content, parent_id: parentId, position }),
      });
    },
    update(
      outlineId: string,
      nodeId: string,
      data: {
        content?: string;
        is_completed?: boolean;
        is_collapsed?: boolean;
      },
    ) {
      return request<Node>(`/api/outlines/${outlineId}/nodes/${nodeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete(outlineId: string, nodeId: string) {
      return request<{ deleted: true }>(
        `/api/outlines/${outlineId}/nodes/${nodeId}`,
        { method: 'DELETE' },
      );
    },
    move(
      outlineId: string,
      nodeId: string,
      parentId: string | null,
      position: number,
    ) {
      return request<Node>(`/api/outlines/${outlineId}/nodes/${nodeId}/move`, {
        method: 'POST',
        body: JSON.stringify({ parent_id: parentId, position }),
      });
    },
    search(outlineId: string, query: string) {
      return request<Node[]>(
        `/api/outlines/${outlineId}/search?q=${encodeURIComponent(query)}`,
      );
    },
  },
};
