import { z } from "zod";

export const authSchema = {
    register: z.object({
        email: z.string().trim().email({ message: "Email không hợp lệ" }).transform((value) => value.toLowerCase()),
        password: z.string().min(10, { message: "Mật khẩu phải từ 10 ký tự trở lên" }),
        fullName: z.string().trim().min(2, { message: "Tên phải từ 2 ký tự trở lên" }).max(255),
    }),
    login: z.object({
        email: z.string().trim().email({ message: "Email không hợp lệ" }).transform((value) => value.toLowerCase()),
        password: z.string().min(1, { message: "Vui lòng nhập mật khẩu" }),
    }),
    updateProfile: z.object({
        full_name: z.string().trim().min(2).max(255).optional(),
        avatar_url: z.string().trim().url().max(500).nullable().optional(),
        bio: z.string().trim().max(5000).nullable().optional(),
    }).strict().refine((value) => Object.keys(value).length > 0, { message: 'Cần ít nhất một trường để cập nhật' }),
    forgotPassword: z.object({
        email: z.string().trim().email({ message: "Email không hợp lệ" }).transform((value) => value.toLowerCase()),
    }),
    resetPassword: z.object({
        token: z.string().regex(/^[a-f0-9]{64}$/i, { message: 'Mã đặt lại mật khẩu không hợp lệ' }),
        newPassword: z.string().min(10, { message: "Mật khẩu phải từ 10 ký tự trở lên" }),
    }),
};
