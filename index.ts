import "dotenv/config";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import metricsPlugin, { apiRequestCounter } from "./src/plugins/metrics.js";
import routes from "./src/routes/scans.js";
import authRoutes from "./src/routes/auth.js";

const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(cors, { origin: true });
await app.register(metricsPlugin);
await app.register(authRoutes);
await app.register(routes);

// basic request counter
app.addHook("onResponse", async (req, reply) => {
  apiRequestCounter.inc({
    route: (req as any).routerPath || req.url,
    method: req.method,
    status: reply.statusCode,
  });
});

const port = Number(process.env.PORT || 8080);
await app.listen({ host: "0.0.0.0", port });
