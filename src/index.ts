import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import metricsPlugin, { apiRequestCounter } from "./plugins/metrics.js";
import routes from "./routes/scans.js";
import authRoutes from "./routes/auth.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

// Metrics middleware
app.use(metricsPlugin);

// Routes
app.use("/auth", authRoutes);
app.use("/", routes);

// Request counter middleware
app.use((req, res, next) => {
  res.on("finish", () => {
    apiRequestCounter.inc({
      route: req.route?.path || req.path,
      method: req.method,
      status: res.statusCode.toString(),
    });
  });
  next();
});

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
