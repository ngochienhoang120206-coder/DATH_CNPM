import { tokenService } from "../../services/token.service.js";
import { ForbiddenException, UnauthorizedException } from "../helpers/exception.helper.js";
import { prisma } from "../prisma/connect.prisma.js";

export const protect = async (req, res, next) => {
    let token = req.cookies?.access_token || req.cookies?.accessToken;

    if (!token && req.headers.authorization) {
        const [type, bearerToken] = req.headers.authorization.split(" ");
        if (type === "Bearer") {
            token = bearerToken;
        }
    }

    if (!token) {
        throw new UnauthorizedException("Vui lòng đăng nhập để truy cập tài nguyên này");
    }

    const decoded = tokenService.verifyAccessToken(token);
    const userId = decoded.userId || decoded.id;

    const user = await prisma.users.findFirst({
        where: {
            id: userId,
            isDeleted: false,
        },
        select: {
            id: true,
            email: true,
            full_name: true,
            status: true,
            role: { select: { name: true } },
        },
    });

    if (!user) {
        throw new UnauthorizedException("Người dùng không tồn tại hoặc đã bị xóa");
    }

    if (user.status === "banned") {
        throw new ForbiddenException("Tài khoản của bạn đã bị khóa do vi phạm");
    }

    req.user = {
        ...user,
        userId: user.id,
        fullName: user.full_name,
        full_name: user.full_name,
        role: user.role?.name || user.role,
    };

    next();
};

export const optionalProtect = async (req, res, next) => {
    const hasCookieToken = Boolean(req.cookies?.access_token || req.cookies?.accessToken);
    const hasBearerToken = req.headers.authorization?.startsWith("Bearer ");
    if (!hasCookieToken && !hasBearerToken) return next();
    return protect(req, res, next);
};

export default protect;
