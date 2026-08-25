import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Called by both mobile apps right after login to register for push notifications.
router.post("/devices/register", requireAuth, async (req, res) => {
  const schema = z.object({ token: z.string().min(10), platform: z.enum(["ios", "android"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { token, platform } = parsed.data;
  const record = await prisma.pushToken.upsert({
    where: { token },
    update: { userId: req.user.id, platform },
    create: { userId: req.user.id, token, platform },
  });
  res.status(201).json(record);
});

router.delete("/devices/unregister", requireAuth, async (req, res) => {
  const schema = z.object({ token: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  await prisma.pushToken.deleteMany({ where: { token: parsed.data.token, userId: req.user.id } });
  res.json({ message: "Unregistered" });
});

export default router;
