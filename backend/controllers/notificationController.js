import prisma from "../utils/prisma.js";

const isSchemaOrTableMissing = (err) => {
  const msg = (err && err.message ? err.message : "").toLowerCase();
  const code = err && err.code ? String(err.code) : "";
  if (code === "P2021" || code === "P2022") return true;
  if (msg.includes("does not exist") && (msg.includes("notification") || msg.includes("relation") || msg.includes("table") || msg.includes("column"))) return true;
  return false;
};

const parseNotification = (n) => {
  let data = null;
  if (n?.data && typeof n.data === "string") {
    try {
      data = JSON.parse(n.data);
    } catch {
      data = null;
    }
  }

  return { ...n, data };
};

export const listNotifications = async (req, res) => {
  try {
    const user = req.user;

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = Math.max(0, Number(req.query.skip) || 0);
    const unreadOnly = (req.query.unreadOnly || "").toString() === "true";

    const where = {
      recipient_id: user.user_id,
      ...(unreadOnly ? { is_read: false } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.notifications.count({ where }),
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              profile: { select: { handle_name: true, profile_image: true } },
            },
          },
        },
      }),
    ]);

    return res.json({ total, skip, limit, notifications: rows.map(parseNotification) });
  } catch (err) {
    console.error("listNotifications error:", err);
    if (isSchemaOrTableMissing(err)) {
      return res.json({ total: 0, skip: 0, limit: 0, notifications: [] });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const unreadCount = async (req, res) => {
  try {
    const user = req.user;
    const count = await prisma.notifications.count({
      where: { recipient_id: user.user_id, is_read: false },
    });
    return res.json({ count, unread: count });
  } catch (err) {
    console.error("unreadCount error:", err);
    if (isSchemaOrTableMissing(err)) {
      return res.json({ count: 0, unread: 0 });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const user = req.user;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const existing = await prisma.notifications.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Notification not found" });

    if (existing.recipient_id !== user.user_id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await prisma.notifications.update({
      where: { id },
      data: { is_read: true },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("markAsRead error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const user = req.user;
    await prisma.notifications.updateMany({
      where: { recipient_id: user.user_id, is_read: false },
      data: { is_read: true },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
