// Using HTTP, might make load balancing easier

import express, { Request, Response } from 'express';
import routes from './routes.js';
import { ValidateError } from './validate.js';
import { PUBLIC_PORT } from '@/env';

// Setup
const app = express();

// API
app.use(express.json());
app.use('/:key', routes);
// Error Handling
app.use((err: Error, _req: Request, res: Response) => {
  console.log('err:\n' + err.stack);
  if (err instanceof ValidateError) {
    res.status(400);
  } else res.status(500);
  res.send({ error: { message: err.message, stack: err.stack } });
});

// Start
app.listen(PUBLIC_PORT, () => {
  console.log('LRU Server is running at port: ' + PUBLIC_PORT);
});
