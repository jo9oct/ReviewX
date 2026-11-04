export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: "Not authenticated", code: "UNAUTHORIZED" },
      });
    }

    const userRole = req.user.role;
    const effectiveRoles = [userRole];
    if (userRole === "admin") effectiveRoles.push("company_admin", "platform_admin");
    if (userRole === "superAdmin") effectiveRoles.push("platform_admin");
    if (userRole === "platform_admin") effectiveRoles.push("superAdmin", "admin");
    if (userRole === "company_admin") effectiveRoles.push("admin");
    if (userRole === "member") effectiveRoles.push("user");
    if (userRole === "user") effectiveRoles.push("member");

    const hasPermission = allowedRoles.some((r) => effectiveRoles.includes(r));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
          code: "FORBIDDEN",
        },
      });
    }

    next();
  };
}

export default authorize;
