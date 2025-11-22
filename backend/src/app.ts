import express from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import cookieParser from "cookie-parser";
import { upload } from "@middlewares/uploadMiddleware";

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
  }),
);

// Middlewares
app.use(express.json());
app.use(cookieParser());
// Mount multer on reports route before OpenAPI validator so multipart bodies
// are parsed by multer (populating req.files) and the validator will
// validate req.body/req.files without re-parsing the raw stream.
app.post(CONFIG.ROUTES.REPORTS, upload.array("photos", 3));

// Conditional application of the OpenAPI validator: skip multipart/form-data
// requests to the reports route to avoid double-parsing the request stream
// (multer and the validator both attempt to parse multipart bodies).
app.use((req, res, next) => {
  const isReportsRoute = req.originalUrl.startsWith(CONFIG.ROUTES.REPORTS);
  // Skip validation for swagger docs and its assets
  const isSwaggerRoute = req.originalUrl.startsWith(CONFIG.ROUTES.SWAGGER);
  const isUploadsRoute = req.originalUrl.startsWith(CONFIG.ROUTES.UPLOADS);
  const contentType = req.headers["content-type"] || "";
  const isMultipart = typeof contentType === "string" && contentType.includes("multipart/form-data");

  if (isReportsRoute && isMultipart) {
    return next();
  }

  if (isSwaggerRoute) {
    return next();
  }
  // Skip validation for uploads (static assets)
  if (isUploadsRoute) {
    return next();
  }

  // `openApiValidator` may be an array of middleware functions or a single function.
  const validator = openApiValidator as unknown as any;
  if (Array.isArray(validator)) {
    let i = 0;
    const runNext = (err?: any) => {
      if (err) return next(err);
      if (i >= validator.length) return next();
      try {
        const mw = validator[i++];
        mw(req, res, runNext);
      } catch (e) {
        next(e);
      }
    };
    return runNext();
  }

  return (openApiValidator as any)(req, res, next);
});

// Health check endpoint
app.get("/", (_req, res) => {
  res.send("Backend is running");
});

// Swagger documentation endpoint
app.use(
  CONFIG.ROUTES.SWAGGER,
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument),
);

// Serve uploaded files statically
app.use(
  CONFIG.ROUTES.UPLOADS,
  express.static(path.join(process.cwd(), "uploads")),
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
