import { NextFunction, Request, Response } from "express";
import HttpError from "./httpError";
import { ZodError } from "zod";



export const responseHandler = (method: Function) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await method(req, res, next);
        } catch (error) {
            let exceptions: HttpError;
            if (error instanceof HttpError) {
                exceptions = error;
            } else {
                if (error instanceof ZodError) {
                    exceptions = new HttpError("input validation error", 400, "VALIDATION_ERROR", error)
                } else {
                    exceptions = new HttpError("something went wrong!", 500, "INTERNAL_ERROR", error);
                }
            }
            next(exceptions);
        }
    }
}