#!/usr/bin/env node
/**
 * Generate an Apple client secret JWT for Supabase Auth → Providers → Apple.
 *
 * Apple requires this JWT (signed with your .p8 key) as the OAuth client secret.
 * Expires in at most 6 months — regenerate and paste into Supabase before expiry.
 *
 * Security:
 *  - Run only on your machine.
 *  - Never commit .p8 or the printed JWT.
 *  - Do not paste the JWT into chat logs.
 *
 * Usage:
 *   node scripts/generate-apple-client-secret.mjs \
 *     --team-id ABCD123456 \
 *     --key-id EFGH789012 \
 *     --client-id online.trimit.app.auth \
 *     --p8 ~/secrets/trimit/AuthKey_XXXXXXXXXX.p8
 *
 * Optional:
 *   --days 150   (default 150; max ~180)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function usage(exitCode = 1) {
  console.error(`
Generate Apple client secret JWT for Supabase (Sign in with Apple).

Required:
  --team-id     Apple Team ID (10 chars)
  --key-id      Apple Key ID for the Sign in with Apple key
  --client-id   Services ID (e.g. online.trimit.app.auth)
  --p8          Path to AuthKey_XXXXXXXXXX.p8

Optional:
  --days        Lifetime in days (default 150, max 180)

Example:
  node scripts/generate-apple-client-secret.mjs \\
    --team-id ABCDE12345 \\
    --key-id FGHIJ67890 \\
    --client-id online.trimit.app.auth \\
    --p8 ~/secrets/trimit/AuthKey_FGHIJ67890.p8
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = { days: 150 };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (!val || val.startsWith('--')) {
      console.error(`Missing value for --${key}`);
      usage(1);
    }
    out[key.replace(/-/g, '_')] = val;
    i += 1;
  }
  return out;
}

function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Convert ASN.1 DER ECDSA signature to raw R||S (JOSE) for P-256.
 * @param {Buffer} der
 * @param {number} size - coordinate size in bytes (32 for P-256)
 */
function derToJose(der, size) {
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error('Invalid DER signature');
  let seqLen = der[offset++];
  if (seqLen & 0x80) {
    const n = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < n; i += 1) seqLen = (seqLen << 8) | der[offset++];
  }
  if (der[offset++] !== 0x02) throw new Error('Invalid DER R');
  const rLen = der[offset++];
  let r = der.subarray(offset, offset + rLen);
  offset += rLen;
  if (der[offset++] !== 0x02) throw new Error('Invalid DER S');
  const sLen = der[offset++];
  let s = der.subarray(offset, offset + sLen);

  r = trimInt(r, size);
  s = trimInt(s, size);
  return Buffer.concat([r, s]);
}

function trimInt(buf, size) {
  let start = 0;
  while (start < buf.length - 1 && buf[start] === 0) start += 1;
  buf = buf.subarray(start);
  if (buf.length > size) {
    buf = buf.subarray(buf.length - size);
  }
  if (buf.length === size) return buf;
  const out = Buffer.alloc(size);
  buf.copy(out, size - buf.length);
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const teamId = args.team_id;
  const keyId = args.key_id;
  const clientId = args.client_id;
  const p8Path = args.p8 ? path.resolve(args.p8) : null;
  const days = Math.min(180, Math.max(1, Number(args.days) || 150));

  if (!teamId || !keyId || !clientId || !p8Path) {
    console.error('Missing required arguments.');
    usage(1);
  }

  if (!fs.existsSync(p8Path)) {
    console.error(`p8 file not found: ${p8Path}`);
    process.exit(1);
  }

  const privateKeyPem = fs.readFileSync(p8Path, 'utf8');
  if (!privateKeyPem.includes('PRIVATE KEY')) {
    console.error('File does not look like a PEM private key (.p8).');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + days * 24 * 60 * 60;

  const header = { alg: 'ES256', kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const derSig = sign.sign(privateKeyPem);
  const joseSig = derToJose(derSig, 32);
  const token = `${data}.${b64url(joseSig)}`;

  const expiresAt = new Date(exp * 1000).toISOString();

  console.log('');
  console.log('=== Apple client secret (paste into Supabase → Auth → Providers → Apple) ===');
  console.log(token);
  console.log('');
  console.log(`client_id (sub):  ${clientId}`);
  console.log(`team_id (iss):    ${teamId}`);
  console.log(`key_id (kid):     ${keyId}`);
  console.log(`expires_at:       ${expiresAt} (${days} days)`);
  console.log('');
  console.log('Also set Client IDs in Supabase to include:');
  console.log('  - online.trimit.app          (native iOS bundle id)');
  console.log(`  - ${clientId}  (Services ID / web)`);
  console.log('');
  console.log('Supabase project: https://etpoecagsfhodtfuhblk.supabase.co');
  console.log(
    'Dashboard: https://supabase.com/dashboard/project/etpoecagsfhodtfuhblk/auth/providers',
  );
  console.log('Rotate this secret at least every 6 months (Apple requirement).');
  console.log('Do not commit this JWT or the .p8 file.');
  console.log('');
}

main();
