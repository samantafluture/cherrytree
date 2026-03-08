import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { type Database } from '../../src/db';
import { createTestApp } from '../helpers/app';
import { setupTestDb, teardownTestDb } from '../helpers/db';

async function getAuthToken(
  app: FastifyInstance,
  suffix = '',
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email: `nodes-test${suffix}@example.com`,
      username: `nodesuser${suffix}`,
      password: 'password123',
    },
  });
  return JSON.parse(res.body).data.token;
}

async function createOutline(
  app: FastifyInstance,
  token: string,
  title = 'Test',
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/outlines',
    headers: { authorization: `Bearer ${token}` },
    payload: { title },
  });
  return JSON.parse(res.body).data;
}

describe('API Routes', () => {
  let db: Database;
  let app: FastifyInstance;
  let token: string;
  let suffix = 0;

  beforeAll(async () => {
    db = await setupTestDb();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM nodes`);
    await db.execute(sql`DELETE FROM sessions`);
    await db.execute(sql`DELETE FROM outlines`);
    await db.execute(sql`DELETE FROM users`);
    suffix++;
    token = await getAuthToken(app, String(suffix));
  });

  describe('Outline routes', () => {
    it('POST /api/outlines creates outline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/outlines',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'My Outline' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.title).toBe('My Outline');
      expect(body.data.id).toBeDefined();
    });

    it('GET /api/outlines lists outlines', async () => {
      await createOutline(app, token, 'First');
      await createOutline(app, token, 'Second');
      const res = await app.inject({
        method: 'GET',
        url: '/api/outlines',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(2);
    });

    it('GET /api/outlines/:id returns outline', async () => {
      const outline = await createOutline(app, token);
      const res = await app.inject({
        method: 'GET',
        url: `/api/outlines/${outline.id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.id).toBe(outline.id);
    });

    it('DELETE /api/outlines/:id deletes outline', async () => {
      const outline = await createOutline(app, token);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/outlines/${outline.id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.deleted).toBe(true);
    });
  });

  describe('Node routes', () => {
    it('POST /api/outlines/:id/nodes creates node', async () => {
      const outline = await createOutline(app, token);
      const res = await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'First node' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.content).toBe('First node');
      expect(body.data.outlineId).toBe(outline.id);
    });

    it('GET /api/outlines/:id/tree returns tree', async () => {
      const outline = await createOutline(app, token);
      await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'Root' },
      });
      const res = await app.inject({
        method: 'GET',
        url: `/api/outlines/${outline.id}/tree`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(1);
      expect(body.data[0].content).toBe('Root');
    });

    it('PATCH /api/outlines/:id/nodes/:nodeId updates node', async () => {
      const outline = await createOutline(app, token);
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'Original' },
      });
      const nodeId = JSON.parse(createRes.body).data.id;
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/outlines/${outline.id}/nodes/${nodeId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.content).toBe('Updated');
    });

    it('DELETE /api/outlines/:id/nodes/:nodeId deletes node', async () => {
      const outline = await createOutline(app, token);
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'To delete' },
      });
      const nodeId = JSON.parse(createRes.body).data.id;
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/outlines/${outline.id}/nodes/${nodeId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.deleted).toBe(true);
    });

    it('POST /api/outlines/:id/nodes/:nodeId/move moves node', async () => {
      const outline = await createOutline(app, token);
      const aRes = await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'A' },
      });
      const bRes = await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'B' },
      });
      const aId = JSON.parse(aRes.body).data.id;
      const bId = JSON.parse(bRes.body).data.id;
      const res = await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes/${bId}/move`,
        headers: { authorization: `Bearer ${token}` },
        payload: { parent_id: aId, position: 0 },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.parentId).toBe(aId);
    });

    it('GET /api/outlines/:id/search?q=term searches nodes', async () => {
      const outline = await createOutline(app, token);
      await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'Buy groceries' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/outlines/${outline.id}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: 'Walk the dog' },
      });
      const res = await app.inject({
        method: 'GET',
        url: `/api/outlines/${outline.id}/search?q=buy`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBe(1);
      expect(body.data[0].content).toBe('Buy groceries');
    });
  });

  describe('Ownership enforcement', () => {
    it('user A cannot access user B outlines', async () => {
      const outline = await createOutline(app, token);
      const tokenB = await getAuthToken(app, `${suffix}-b`);
      const res = await app.inject({
        method: 'GET',
        url: `/api/outlines/${outline.id}`,
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
