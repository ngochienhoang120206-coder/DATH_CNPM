import { statusCodes } from "./status-code.helper.js";

export const responseSuccess = (data, message = "OK", statusCode = statusCodes.OK, meta = undefined) => {
    return {
        success: true,
        status: "success",
        statusCode: statusCode,
        message: message,
        data: data,
        ...(meta !== undefined && { meta, pagination: meta }),
        doc: "swagger.com",
    };
};

export const responseError = (message = "Internal Server Error", statusCode = statusCodes.INTERNAL_SERVER_ERROR, stack) => { 
    return {
        status: "error",
        statusCode: statusCode,
        message: message,
        // stack: stack, // chỉ nên show khi ở môi trường deverloper, còn khi lên prodtion thì tắt
        doc: "swagger.com",
    }
 }
