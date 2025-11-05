import express from 'express';
import cors from 'cors';
import authRouter from './routes/authRouter';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();
const swaggerDocument = YAML.load('../doc/OpenAPI_swagger.yml');

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