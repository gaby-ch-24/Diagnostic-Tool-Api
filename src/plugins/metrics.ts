import { Request, Response, NextFunction } from "express";
import client from "prom-client";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

export const apiRequestCounter = new client.Counter({
  name: "api_requests_total",
  help: "Total number of API requests",
  labelNames: ["route", "method", "status"],
});

const metricsPlugin = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/metrics") {
    client.register.metrics().then((body) => {
      res.set("Content-Type", client.register.contentType);
      res.send(body);
    });
  } else {
    next();
  }
};

export default metricsPlugin;
