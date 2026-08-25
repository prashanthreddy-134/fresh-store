import nodemailer from "nodemailer";
import { Expo } from "expo-server-sdk";
import { prisma } from "../prismaClient.js";

const expo = new Expo();

// Sends a real push notification via Expo's push service to every device
// the user is registered on. Silently no-ops if they have no registered devices
// (e.g. web-only customers) — push is additive, never required for the app to work.
async function sendPush(userId, { title, body }) {
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  if (tokens.length === 0) return;

  const messages = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({ to: t.token, sound: "default", title, body }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      // Clean up tokens Expo reports as no longer registered (app uninstalled, etc.)
      receipts.forEach((r, i) => {
        if (r.status === "error" && r.details?.error === "DeviceNotRegistered") {
          prisma.pushToken.deleteMany({ where: { token: chunk[i].to } }).catch(() => {});
        }
      });
    } catch (err) {
      console.error("Push notification send failed:", err.message);
    }
  }
}

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function notifyUser(userId, { channel, title, body, email }) {
  let status = "SENT";
  try {
    if (channel === "EMAIL" && email) {
      const t = getTransporter();
      if (t) {
        await t.sendMail({ from: process.env.SMTP_FROM, to: email, subject: title, text: body });
      } else {
        console.log(`[DEV EMAIL] to ${email}: ${title} - ${body}`);
      }
    } else if (channel === "SMS") {
      // Reuses the same SMS provider as OTP in a real deployment; kept as a log here
      // so this file has no hard dependency on which provider is configured.
      console.log(`[SMS] ${title}: ${body}`);
    } else {
      console.log(`[PUSH] ${title}: ${body}`);
    }
  } catch (err) {
    status = "FAILED";
    console.error("Notification dispatch failed:", err.message);
  }

  await prisma.notification.create({
    data: { userId, channel, title, body, status },
  });

  // Fire a push notification alongside SMS/email so mobile users get an instant alert
  // regardless of which channel was requested — this mirrors how Zepto/Blinkit-style
  // apps notify: the "important" channel (SMS) is the record of truth, push is the nudge.
  await sendPush(userId, { title, body });
}

export async function notifyOrderStatus(order, user) {
  const messages = {
    CONFIRMED: "Your order has been confirmed and is being prepared.",
    PACKED: "Your order is packed and will be out for delivery soon.",
    OUT_FOR_DELIVERY: "Your order is out for delivery.",
    DELIVERED: "Your order has been delivered. Enjoy!",
    CANCELLED: "Your order has been cancelled.",
  };
  const body = messages[order.status] || `Order status updated: ${order.status}`;
  await notifyUser(user.id, {
    channel: "SMS",
    title: `Order ${order.orderNumber}`,
    body,
    email: user.email,
  });
}
