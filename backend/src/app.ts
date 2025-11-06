import express from 'express';
import cors from 'cors';
import authRouter from './routes/authRouter';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const app = express();

const isDocker = process.env.IS_DOCKER === 'true';
const swaggerPath = isDocker
  ? '/app/doc/OpenAPI_swagger.yml'        // dentro container
  : '../doc/OpenAPI_swagger.yml'; // locale

const swaggerDocument = YAML.load(swaggerPath);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.get('/', (_req, res) => {
  res.send('Backend is running');
});

export default app;