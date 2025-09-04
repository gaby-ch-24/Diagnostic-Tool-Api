import { createWorker } from '../lib/queue.js';
import { prisma } from '../lib/db.js';
import { fetchHtml, extractLinks, checkLinks } from '../services/linkscan.js';

export function startScanWorker() {
  return createWorker('scans', async (job) => {
  const { scanId, url, maxLinks, concurrency } = job.data as { scanId: string; url: string; maxLinks: number; concurrency: number };

  const started = Date.now();
  await prisma.scan.update({ where: { id: scanId }, data: { status: 'RUNNING', startedAt: new Date() } });

  try {
    const html = await fetchHtml(url);
    const links = extractLinks(html, url, maxLinks);
    const results = await checkLinks(links, concurrency);

    // save items in batches
    const batchSize = 100;
    for (let i=0; i<results.length; i+=batchSize) {
      const slice = results.slice(i, i+batchSize);
      await prisma.scanItem.createMany({
        data: slice.map(r => ({
          scanId, url: r.url, ok: r.ok, statusCode: r.statusCode, statusText: r.statusText, redirected: r.redirected, error: r.error
        }))
      });
    }

    const ok = results.filter(r => r.ok).length;
    const broken = results.length - ok;
    const durationMs = Date.now() - started;

    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'COMPLETED', finishedAt: new Date(), durationMs, totalLinks: results.length, okCount: ok, brokenCount: broken }
    });
  } catch (e:any) {
    // Save a placeholder ScanItem with error details
    await prisma.scanItem.create({
      data: {
        scanId,
        url,
        ok: false,
        statusCode: null,
        statusText: null,
        redirected: null,
        error: String(e)
      }
    });
    await prisma.scan.update({ where: { id: scanId }, data: { status: 'FAILED', finishedAt: new Date() } });
    throw e;
  }
  });
}