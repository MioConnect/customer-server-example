'use strict';
class APIError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.message = message;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }
}

module.exports = { APIError };

