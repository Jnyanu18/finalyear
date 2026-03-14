import { env } from "../../config/env.js";
import { logger } from "./logger.js";

let firebaseAppReady = false;

async function sendEmail(alert) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return { channel: "email", status: "disabled" };
  }

  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to: env.smtpUser,
    subject: `[AgroSense AI] ${alert.severity.toUpperCase()} - ${alert.title}`,
    text: `${alert.description}\n\nRecommendation: ${alert.recommendation}`
  });
  return { channel: "email", status: "sent" };
}

async function sendPush(alert) {
  if (!env.firebaseProjectId || !env.firebaseClientEmail || !env.firebasePrivateKey) {
    return { channel: "push", status: "disabled" };
  }

  const admin = await import("firebase-admin");
  if (!firebaseAppReady) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey.replace(/\\n/g, "\n")
      })
    });
    firebaseAppReady = true;
  }

  await admin.messaging().send({
    topic: `field-${alert.fieldId}`,
    notification: {
      title: alert.title,
      body: alert.description
    },
    data: {
      severity: alert.severity,
      fieldId: alert.fieldId,
      zoneId: alert.zoneId
    }
  });

  return { channel: "push", status: "sent" };
}

async function sendSms(alert) {
  if (alert.severity !== "critical") {
    return { channel: "sms", status: "skipped" };
  }
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromNumber) {
    return { channel: "sms", status: "disabled" };
  }

  const { default: twilio } = await import("twilio");
  const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  await client.messages.create({
    body: `${alert.title}: ${alert.recommendation}`,
    from: env.twilioFromNumber,
    to: process.env.ALERT_SMS_TO || env.twilioFromNumber
  });

  return { channel: "sms", status: "sent" };
}

export async function deliverAlertNotifications(alert) {
  const tasks = [sendEmail(alert), sendPush(alert), sendSms(alert)];
  const settled = await Promise.allSettled(tasks);
  const summary = settled.map((entry, index) => {
    if (entry.status === "fulfilled") {
      return entry.value;
    }
    const channel = ["email", "push", "sms"][index];
    logger.warn("alert_delivery_failed", { channel, alertId: alert.id, error: entry.reason?.message });
    return { channel, status: "failed", error: entry.reason?.message || "Unknown error" };
  });
  return summary;
}
