import express, { NextFunction, Request, Response } from 'express';
import routes from './routes';
import { ValidateError } from './validate';
import { PUBLIC_PORT } from './env';

// Setup
const app = express();

// API
app.use(express.json());
app.use('/', routes);
// Error Handling
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  console.log('err:\n' + err.stack);
  if (err instanceof ValidateError) {
    res.status(400);
  } else res.status(500);
  res.send({ error: { message: err.message, stack: err.stack } });
  next();
});

// Start
app.listen(PUBLIC_PORT, () => {
  console.log('LRU Server is running at port: ' + PUBLIC_PORT);
});
