import nodemailer, { type Transporter } from 'nodemailer';

export type MailStatus = 'sent' | 'not_configured' | 'failed';

export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
export const leadInbox = () => process.env.NOTIFY_TO || null;

let transport: Transporter | undefined;
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

/** Never throws; the status reflects the SMTP provider's actual result. */
export async function sendMail(opts: { to: string | null; subject: string; text: string; html?: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] }): Promise<MailStatus> {
  const to = opts.to; if (!mailConfigured() || !to) return 'not_configured';
  try {
    await getTransport().sendMail({ from: process.env.MAIL_FROM, ...opts, to });
    return 'sent';
  } catch (err) {
    console.error('[mail] send failed:', (err as Error).message);
    return 'failed';
  }
}
