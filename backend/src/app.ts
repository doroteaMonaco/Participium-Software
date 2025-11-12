import express from "express";
import cors from "cors";
import path from "path";
import authRouter from "./routes/authRouter";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import cookieParser from "cookie-parser";
import reportRouter from "./routes/reportRouter";
import userRouter from "./routes/userRouter";

const app = express();

const isDocker = process.env.IS_DOCKER === "true";
const swaggerPath = isDocker
  ? "/app/doc/OpenAPI_swagger.yml" // dentro container
  : "../doc/OpenAPI_swagger.yml"; // locale

const swaggerDocument = YAML.load(swaggerPath);

// Configure CORS to allow credentials and frontend origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRouter);
app.use("/api/reports", reportRouter);
app.use("/api/users", userRouter);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res
      .status(400)
      .json({ error: "Validation Error", message: "Invalid JSON" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal Server Error" });
});

app.get("/", (_req, res) => {
  res.send("Backend is running");
});

export default app;
