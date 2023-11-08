import express, { Request } from 'express';
import cache from './cache/lrucache';
import { body, param } from 'express-validator';
import validate from './validate.js';

const routes = express.Router();
const innerRoutes = express.Router({ mergeParams: true });
routes.use('/:key', param('key').isAlpha(), validate, innerRoutes);

innerRoutes.get('/', async (req: Request, res) => {
  const result = await cache.get(req.params.key);
  res.status(200).send(result);
});
innerRoutes.post('/', body('value').isJSON(), async (req: Request, res) => {
  await cache.put(req.params.key, req.body.value);
  res.sendStatus(200);
});
innerRoutes.delete('/', async (req: Request, res) => {
  await cache.del(req.params.key);
  res.sendStatus(200);
});

export default routes;
