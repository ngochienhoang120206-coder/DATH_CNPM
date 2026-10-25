import { ForbiddenException } from "../helpers/exception.helper.js";

// Hỗ trợ kiểm tra linh hoạt: authorizeRoles('student') hoặc authorizeRoles('instructor', 'admin')
export const authorizeRoles = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này.");
    }
    next();
};

export const authorizeAdmin = authorizeRoles("admin");

export default authorizeRoles;
