import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    schema.parse(req.body);
    next();
  };
};
