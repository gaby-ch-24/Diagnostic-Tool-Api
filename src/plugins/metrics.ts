import type { FastifyPluginAsync } from 'fastify';
import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const apiRequestCounter = new client.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['route', 'method', 'status']
});

const metricsPlugin: FastifyPluginAsync = async (app) => {
  app.get('/metrics', async (_req, reply) => {
    const body = await client.register.metrics();
    reply.type(client.register.contentType).send(body);
  });
};

export default metricsPlugin;
