import express from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import cookieParser from "cookie-parser";

// Import configuration, middlewares, and routers
import { CONFIG } from "@config";
import { openApiValidator } from "@middlewares/validatorMiddleware";
import errorHandler from "@middlewares/errorMiddleware";
import reportRouter from "@routes/reportRouter";
import authRouter from "@routes/authRouter";
import userRouter from "@routes/userRouter";

const app = express();

const swaggerDocument = YAML.load(CONFIG.SWAGGER_PATH);

// Configure CORS to allow credentials and frontend origin
app.use(
  cors({
    origin: CONFIG.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middlewares
app.use(express.json());
app.use(openApiValidator);
app.use(cookieParser());

// Health check endpoint
app.get("/", (_req, res) => {
  res.send("Backend is running");
});

// Swagger documentation endpoint
app.use(
  CONFIG.ROUTES.SWAGGER,
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// Serve uploaded files statically
app.use(
  CONFIG.ROUTES.UPLOADS,
  express.static(path.join(process.cwd(), "uploads"))
);

// Mount routers
app.use(CONFIG.ROUTES.AUTH, authRouter);
app.use(CONFIG.ROUTES.USERS, userRouter);
app.use(CONFIG.ROUTES.REPORTS, reportRouter);

// OpenAPI validation error handler
app.use((err: any, _req: any, res: any, next: any) => {
  // Check if it's an OpenAPI validator error
  if (err.status && err.errors && Array.isArray(err.errors)) {
    // OpenAPI validation error
    return res.status(400).json({
      error: "Validation Error",
      message: err.message || "Request validation failed",
      details: err.errors,
    });
  }
  next(err);
});

// Generic error handlers
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res
      .status(400)
      .json({ error: "Validation Error", message: "Invalid JSON" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal Server Error" });
});

// This must always be the last middleware added
app.use(errorHandler);

export default app;
