import nodemailer, { type Transporter } from 'nodemailer';

/** 'sample' = captured by a free Ethereal test inbox (nothing is delivered); viewable through the preview link. */
export type MailStatus = 'sent' | 'sample' | 'not_configured' | 'failed';
export interface MailResult { status: MailStatus; preview?: string }

export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
export const leadInbox = () => process.env.NOTIFY_TO || null;
const sampleAllowed = () => process.env.MAIL_SAMPLE !== 'off';

let transport: Transporter | undefined;
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    // Fail fast instead of hanging for minutes on a dead SMTP host.
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 20000,
  });
  return transport;
}

let sample: Promise<Transporter> | undefined;
function getSample() {
  sample ??= nodemailer.createTestAccount().then((a) => nodemailer.createTransport({ host: a.smtp.host, port: a.smtp.port, secure: a.smtp.secure, auth: { user: a.user, pass: a.pass } }));
  return sample;
}

type Opts = { to: string | null; subject: string; text: string; html?: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] };

/** Never throws. With real SMTP configured it sends for real; otherwise (unless MAIL_SAMPLE=off) it uses a sample test inbox. */
export async function sendMailX(opts: Opts): Promise<MailResult> {
  if (mailConfigured()) {
    if (!opts.to) return { status: 'not_configured' };
    try {
      await getTransport().sendMail({ from: process.env.MAIL_FROM, ...opts, to: opts.to });
      return { status: 'sent' };
    } catch (err) {
      console.error('[mail] send failed:', (err as Error).message);
      return { status: 'failed' };
    }
  }
  if (!sampleAllowed()) return { status: 'not_configured' };
  try {
    const info = await (await getSample()).sendMail({ from: '"Single Dot Studio (sample)" <sample@singledotstudio.test>', ...opts, to: opts.to || 'studio@singledotstudio.test' });
    return { status: 'sample', preview: nodemailer.getTestMessageUrl(info) || undefined };
  } catch (err) {
    console.error('[mail] sample send failed:', (err as Error).message);
    sample = undefined;
    return { status: 'failed' };
  }
}

export async function sendMail(opts: Opts): Promise<MailStatus> {
  return (await sendMailX(opts)).status;
}
