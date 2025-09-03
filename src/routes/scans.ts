import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { scansQueue } from "../lib/queue.js";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.get("/scans", async (req: Request, res: Response) => {
  const { searchParams } = new URL(req.url, "http://local");
  const take = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
  const cursor = searchParams.get("cursor");
  const where = {};
  const scans = await prisma.scan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = scans.length > take ? scans.pop()?.id : null;
  res.json({ data: scans, nextCursor });
});

router.get("/scans/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!scan) return res.status(404).json({ error: "Not found" });
  // Format items for table display
  const items = scan.items.map((item: any) => ({
    url: item.url,
    ok: item.ok,
    code: item.statusCode,
    statusText: item.statusText,
    redirected: item.redirected,
    error: item.error,
  }));
  res.json({ ...scan, items });
});

router.get("/scans/:id/items", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { searchParams } = new URL(req.url, "http://local");
  const take = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const cursor = searchParams.get("cursor");
  const status = searchParams.get("status"); // ok|broken|all
  const where: any = { scanId: id };
  if (status === "ok") where.ok = true;
  if (status === "broken") where.ok = false;
  const items = await prisma.scanItem.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const nextCursor = items.length > take ? items.pop()?.id : null;
  res.json({ data: items, nextCursor });
});

router.post("/scans", async (req: Request, res: Response) => {
  const body = z
    .object({
      url: z.string().url(),
      maxLinks: z.number().int().positive().max(5000).optional(),
      concurrency: z.number().int().positive().max(64).optional(),
    })
    .parse(req.body);

  const scan = await prisma.scan.create({
    data: { url: body.url, status: "QUEUED" },
  });

  await scansQueue.add(
    "scan",
    {
      scanId: scan.id,
      url: scan.url,
      maxLinks: body.maxLinks ?? Number(process.env.SCAN_MAX_LINKS || 800),
      concurrency:
        body.concurrency ?? Number(process.env.SCAN_CONCURRENCY || 16),
    },
    { removeOnComplete: true, removeOnFail: true }
  );

  res.status(202).json({ id: scan.id, status: "QUEUED" });
});

router.post("/scans/:id/retry", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) return res.status(404).json({ error: "Not found" });
  await prisma.scan.update({
    where: { id },
    data: {
      status: "QUEUED",
      startedAt: null,
      finishedAt: null,
      durationMs: null,
    },
  });
  await scansQueue.add(
    "scan",
    {
      scanId: id,
      url: scan.url,
      maxLinks: Number(process.env.SCAN_MAX_LINKS || 800),
      concurrency: Number(process.env.SCAN_CONCURRENCY || 16),
    },
    { removeOnComplete: true, removeOnFail: true }
  );
  res.json({ ok: true });
});

export default router;
