/* Exercises the webhook signature check the way Cloudflare and an attacker
   would, since it is the only thing standing in front of a secret-key write. */
import { createHmac } from 'node:crypto';

const { verifyWebhook } = await import(
  new URL('../lib/stream-signature.ts', import.meta.url).href,
);
const SECRET = '85011ed3a913c6ad5f9cf6c5573cc0a7';
const body = JSON.stringify({ uid: 'abc123', status: { state: 'ready' }, duration: 182.5 });
const now = Math.floor(Date.now() / 1000);
const sign = (t, b, s = SECRET) => createHmac('sha256', s).update(`${t}.${b}`).digest('hex');

const cases = [
  ['a genuine signature',        SECRET, `time=${now},sig1=${sign(now, body)}`,            body, true],
  ['a tampered body',            SECRET, `time=${now},sig1=${sign(now, body)}`,            body.replace('ready', 'error'), false],
  ['signed with the wrong key',  SECRET, `time=${now},sig1=${sign(now, body, 'nope')}`,    body, false],
  ['a replay from an hour ago',  SECRET, `time=${now - 3600},sig1=${sign(now - 3600, body)}`, body, false],
  ['no header at all',           SECRET, null,                                             body, false],
  ['a malformed header',         SECRET, 'garbage',                                        body, false],
  ['a truncated signature',      SECRET, `time=${now},sig1=${sign(now, body).slice(0, 10)}`, body, false],
  ['no secret configured',       '',     `time=${now},sig1=${sign(now, body)}`,            body, false],
];

let bad = 0;
for (const [name, secret, header, payload, want] of cases) {
  const got = verifyWebhook(secret, header, payload).ok;
  const pass = got === want;
  if (!pass) bad++;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name.padEnd(28)} accepted=${got} expected=${want}`);
}
console.log(bad === 0 ? '\n  all 8 behave' : `\n  ${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
