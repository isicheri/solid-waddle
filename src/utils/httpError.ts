export default class HttpError extends Error {
    status: number;
    errname: string;
    errorobj: unknown;
    constructor(message: string, status: number, errname: string, errorobj: unknown) {
        super(message);
        this.status = status;
        this.errname = errname;
        this.errorobj = errorobj;
        this.name = this.constructor.name;

        Error.captureStackTrace(this, this.constructor);
    }
}