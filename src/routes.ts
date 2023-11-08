import express, { Request, Response } from 'express';
import cache from './cache';
import { body, param } from 'express-validator';
import validate from './validate';

const routes = express.Router();
const innerRoutes = express.Router({ mergeParams: true });
routes.use('/:key', param('key').isAlpha(), validate, innerRoutes);

innerRoutes.get('/', async (req: Request, res: Response) => {
  const value = await cache.get(req.params.key);
  res.status(200).send({ value });
});
innerRoutes.post('/', body('value').isJSON(), body('ttl').optional().isNumeric(), async (req: Request, res) => {
  await cache.put(req.params.key, req.body.value, req.body.ttl);
  res.sendStatus(200);
});
innerRoutes.delete('/', async (req: Request, res) => {
  const success = await cache.del(req.params.key);
  res.status(200).send({ success });
});

export default routes;
