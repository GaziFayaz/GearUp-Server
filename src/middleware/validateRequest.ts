import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validateRequest = (
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body",
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    schema.parse(req[source]);
    next();
  };
};
