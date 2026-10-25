import { responseError } from "./response.helper.js";
import { statusCodes } from "./status-code.helper.js";

export const appError = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    // Ưu tiên lấy statusCode từ Exception, sau đó tới err.code
    let statusCode = err?.statusCode || (Number.isInteger(err?.code) ? err.code : statusCodes.INTERNAL_SERVER_ERROR);
    let message = err?.message;

    // Xử lý mã lỗi đặc thù từ Prisma ORM
    if (err?.code === "P2002") {
        statusCode = statusCodes.CONFLICT;
        message = "Dữ liệu đã tồn tại trong hệ thống (trùng lặp)";
    } else if (err?.code === "P2003") {
        statusCode = statusCodes.CONFLICT;
        message = "Dữ liệu đang được liên kết ràng buộc, không thể thực hiện thao tác";
    } else if (err?.code === "P2025") {
        statusCode = statusCodes.NOT_FOUND;
        message = "Không tìm thấy dữ liệu yêu cầu";
    }

    // Lỗi hệ thống 500 thì log ra console và giấu chi tiết với client khi lên production
    if (statusCode >= 500) {
        console.error("[500 ERROR STACK]:", err);
        message = "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.";
    }

    const response = responseError(message, statusCode, err?.stack);
    res.status(response.statusCode).json(response);
};

export default appError;
