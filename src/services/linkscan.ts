import { load } from 'cheerio';
import { URL } from 'node:url';
import pLimit from 'p-limit';
import { fetch } from 'undici';

export type LinkResult = { url: string; ok: boolean; statusCode?: number; statusText?: string; redirected?: boolean; error?: string };

export async function fetchHtml(target: string): Promise<string> {
  const res = await fetch(target, { redirect: 'follow' as any });
  return await res.text();
}

export function extractLinks(html: string, base: string, cap: number) {
  const origin = new URL(base);
  const $ = load(html);
  const raw: string[] = [];
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const abs = new URL(href, origin).toString();
      if (/^https?:\/\//i.test(abs)) raw.push(abs);
    } catch {}
  });
  const unique = Array.from(new Set(raw)).slice(0, cap);
  return unique;
}

export async function checkLinks(urls: string[], concurrency: number): Promise<LinkResult[]> {
  const limit = pLimit(concurrency);
  const checks = urls.map((u) => limit(async () => checkOne(u)));
  return await Promise.all(checks);
}

async function checkOne(url: string): Promise<LinkResult> {
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow' as any });
    if ([405,403,404].includes(r.status)) {
      r = await fetch(url, { method: 'GET', redirect: 'follow' as any });
    }
    const ok = r.status < 400;
    return { url, ok, statusCode: r.status, statusText: r.statusText, redirected: r.redirected };
  } catch (e:any) {
    return { url, ok: false, error: String(e) };
  }
}
