// Using HTTP, might make load balancing easier

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import routes from './routes.js';
import { ValidateError } from './validate.js';

dotenv.config();

const app = express();

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

app.listen(process.env.PUBLIC_PORT, () => {
  console.log('LRU Server is running at port: ' + process.env.PUBLIC_PORT);
});
