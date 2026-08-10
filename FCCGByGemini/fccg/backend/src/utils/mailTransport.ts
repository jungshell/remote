import nodemailer from 'nodemailer';

export type MailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string;
};

export type MailMessage = {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
};

export type MailTransportMode = 'gmail-api' | 'smtp' | 'smtp-fallback' | 'none';

type GmailAccessTokenCache = {
  token: string;
  expiresAt: number;
};

let gmailAccessTokenCache: GmailAccessTokenCache | null = null;
let smtpTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function hasGmailApiConfig() {
  return Boolean(
    process.env.GMAIL_USER &&
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

function hasSmtpConfig() {
  return Boolean(
    process.env.GMAIL_USER &&
    (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS)
  );
}

export function getMailConfigurationStatus() {
  const hasApi = hasGmailApiConfig();
  const hasSMTP = hasSmtpConfig();
  const mode: MailTransportMode = hasApi ? 'gmail-api' : hasSMTP ? 'smtp' : 'none';
  return {
    configured: hasApi || hasSMTP,
    mode,
    gmailUserConfigured: Boolean(process.env.GMAIL_USER),
    gmailClientIdConfigured: Boolean(process.env.GMAIL_CLIENT_ID),
    gmailClientSecretConfigured: Boolean(process.env.GMAIL_CLIENT_SECRET),
    gmailRefreshTokenConfigured: Boolean(process.env.GMAIL_REFRESH_TOKEN),
    gmailAppPasswordConfigured: Boolean(process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS),
    gmailApiConfigured: hasApi,
    smtpConfigured: hasSMTP,
    smtpFallbackAvailable: hasApi && hasSMTP,
  };
}

function safeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string) {
  const safeValue = safeHeaderValue(value);
  return `=?UTF-8?B?${Buffer.from(safeValue, 'utf8').toString('base64')}?=`;
}

function wrapBase64(value: Buffer | string) {
  const encoded = Buffer.isBuffer(value)
    ? value.toString('base64')
    : Buffer.from(value, 'utf8').toString('base64');
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
}

function makeBoundary(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildGmailRawMessage(message: MailMessage) {
  const from = safeHeaderValue(message.from || process.env.GMAIL_USER || '');
  const to = safeHeaderValue(message.to);
  const mixedBoundary = makeBoundary('fccg_mixed');
  const altBoundary = makeBoundary('fccg_alt');
  const attachments = message.attachments || [];
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(message.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(message.text || 'FC CHAL-GGYEO 알림입니다.'),
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(message.html || `<p>${message.text || 'FC CHAL-GGYEO 알림입니다.'}</p>`),
    '',
    `--${altBoundary}--`
  ];

  for (const attachment of attachments) {
    const filename = safeHeaderValue(attachment.filename);
    lines.push(
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: ${attachment.cid ? 'inline' : 'attachment'}; filename="${filename}"`,
      ...(attachment.cid ? [`Content-ID: <${safeHeaderValue(attachment.cid)}>`] : []),
      '',
      wrapBase64(attachment.content)
    );
  }

  lines.push('', `--${mixedBoundary}--`, '');
  return Buffer.from(lines.join('\r\n'), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function getGmailAccessToken() {
  if (gmailAccessTokenCache && gmailAccessTokenCache.expiresAt > Date.now() + 60_000) {
    return gmailAccessTokenCache.token;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID || '',
      client_secret: process.env.GMAIL_CLIENT_SECRET || '',
      refresh_token: process.env.GMAIL_REFRESH_TOKEN || '',
      grant_type: 'refresh_token'
    })
  });

  const result = await response.json() as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !result.access_token) {
    const code = result.error ?? 'unknown';
    const desc = result.error_description ?? 'access token not returned';
    throw new Error(`Gmail OAuth token check failed (HTTP ${response.status}): code=${code} desc=${desc}`);
  }

  gmailAccessTokenCache = {
    token: result.access_token,
    expiresAt: Date.now() + (result.expires_in || 3600) * 1000
  };
  return result.access_token;
}

async function sendViaGmailApi(message: MailMessage) {
  const accessToken = await getGmailAccessToken();
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: buildGmailRawMessage(message) })
  });

  const result = await response.json() as {
    id?: string;
    error?: { message?: string; status?: string; code?: number };
  };

  if (!response.ok) {
    throw new Error(`Gmail API send failed (HTTP ${response.status}${result.error?.status ? ` ${result.error.status}` : ''}): ${result.error?.message || 'message was rejected'}`);
  }

  return { mode: 'gmail-api' as const, messageId: result.id };
}

function getSmtpTransporter() {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS
      }
    });
  }
  return smtpTransporter;
}

/**
 * 단일 진입점. Gmail API → SMTP fallback 순으로 시도한다.
 *
 * 1. Gmail API 설정 있음 → 시도
 *    성공: transport=gmail-api 로그 후 반환
 *    실패: warning 로그 (code, desc 포함) → 2단계
 * 2. SMTP 설정 있음 → 시도
 *    성공: fallback 성공 로그 후 반환 (mode='smtp-fallback')
 *    실패: 두 오류 합산 후 throw
 * 3. 모든 transport 없음 → throw
 */
export async function sendMail(message: MailMessage): Promise<{ mode: MailTransportMode; messageId?: string }> {
  let gmailError: Error | null = null;

  // ── 1. Gmail API 시도 ──────────────────────────────────────────────────────
  if (hasGmailApiConfig()) {
    try {
      const result = await sendViaGmailApi(message);
      console.log('[MAIL] transport=gmail-api');
      return result;
    } catch (err) {
      gmailError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[MAIL] Gmail API failed — ${gmailError.message}`);
    }
  }

  // ── 2. SMTP fallback ───────────────────────────────────────────────────────
  if (hasSmtpConfig()) {
    try {
      const result = await getSmtpTransporter().sendMail({
        ...message,
        from: message.from || process.env.GMAIL_USER
      });
      const mode: MailTransportMode = gmailError ? 'smtp-fallback' : 'smtp';
      if (gmailError) {
        console.log(`[MAIL] transport=smtp-fallback reason=${gmailError.message}`);
      } else {
        console.log('[MAIL] transport=smtp');
      }
      return { mode, messageId: result.messageId };
    } catch (smtpErr) {
      const smtpMsg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      const combined = gmailError
        ? `Gmail: ${gmailError.message}; SMTP: ${smtpMsg}`
        : `SMTP: ${smtpMsg}`;
      throw new Error(`[MAIL] All transports failed — ${combined}`);
    }
  }

  // ── 3. 설정 없음 ───────────────────────────────────────────────────────────
  if (gmailError) throw gmailError;
  throw new Error('메일 환경변수가 설정되지 않았습니다.');
}

/**
 * 관리자 /api/admin/mail-status 또는 헬스체크용.
 * throw하지 않고 status 객체를 반환한다.
 */
export async function verifyMailTransport(): Promise<{ success: boolean; mode: MailTransportMode; error?: string }> {
  if (hasGmailApiConfig()) {
    try {
      await getGmailAccessToken();
      return { success: true, mode: 'gmail-api' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (hasSmtpConfig()) {
        try {
          await getSmtpTransporter().verify();
          return { success: true, mode: 'smtp-fallback', error: msg };
        } catch {
          return { success: false, mode: 'none', error: msg };
        }
      }
      return { success: false, mode: 'none', error: msg };
    }
  }
  if (hasSmtpConfig()) {
    try {
      await getSmtpTransporter().verify();
      return { success: true, mode: 'smtp' };
    } catch (err) {
      return { success: false, mode: 'none', error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { success: false, mode: 'none', error: 'mail-not-configured' };
}
