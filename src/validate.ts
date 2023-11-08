import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

export class ValidateError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string, stack?: unknown) {
    super(message); // 'Error' breaks prototype chain here
    this.name = 'MiddlewareError';
    this.stack = JSON.stringify(stack);
    this.statusCode = statusCode;
  }
}

const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return next(new ValidateError(400, `Input failed validation`, errors.array()));
};

export default validate;
