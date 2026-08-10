export const writerOnly = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (req.user?.is_writer !== true && role !== "writer") {
    return res.status(403).json({ message: "Writer access required" });
  }
  next();
};
