export const writerOnly = (req, res, next) => {
  if (!req.user?.is_writer) return res.status(403).json({ message: "Writer access required" });
  next();
};
