import jwt from "jsonwebtoken";
import {
    BadRequestException,
    ForbiddenException,
    UnauthorizedException,
} from "../common/helpers/exception.helper.js";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "../common/constant/app.constant.js";

const getAccessSecret = () => ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const getRefreshSecret = () => REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;

export const tokenService = {
    createAccessToken(userId, role) {
        if (!userId) throw new BadRequestException("Không có userId để tạo token");
        if (!role) throw new BadRequestException("Không có role để tạo token");
        const secret = getAccessSecret();
        if (!secret) throw new Error("ACCESS_TOKEN_SECRET or JWT_SECRET must be configured");
        return jwt.sign({ userId, role }, secret, { expiresIn: "24h", algorithm: "HS256" });
    },

    createRefreshToken(userId) {
        if (!userId) throw new BadRequestException("Không có userId để tạo token");
        const secret = getRefreshSecret();
        if (!secret) throw new Error("REFRESH_TOKEN_SECRET must be configured");
        return jwt.sign({ userId }, secret, { expiresIn: "7d", algorithm: "HS256" });
    },

    verifyAccessToken(accessToken, option = {}) {
        try {
            const secret = getAccessSecret();
            if (!secret) throw new Error("ACCESS_TOKEN_SECRET or JWT_SECRET must be configured");
            return jwt.verify(accessToken, secret, { algorithms: ["HS256"], ...option });
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                throw new ForbiddenException("Token đã hết hạn, vui lòng đăng nhập lại");
            }
            throw new UnauthorizedException("Token không hợp lệ");
        }
    },

    verifyRefreshToken(refreshToken, option = {}) {
        try {
            const secret = getRefreshSecret();
            if (!secret) throw new Error("REFRESH_TOKEN_SECRET must be configured");
            return jwt.verify(refreshToken, secret, { algorithms: ["HS256"], ...option });
        } catch {
            throw new UnauthorizedException("Refresh token không hợp lệ hoặc đã hết hạn");
        }
    },

};

export default tokenService;
