import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.body ?? {});

    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    request.body = parsed.data;
    next();
  };
}
