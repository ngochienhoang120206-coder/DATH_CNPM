import { protect } from "./protect.middleware.js";
import { authorizeRoles } from "./authorize.middleware.js";

export const verifyToken = protect;
export const requireRole = authorizeRoles;

export { protect, authorizeRoles };

export default {
    protect,
    authorizeRoles,
    verifyToken,
    requireRole
};
