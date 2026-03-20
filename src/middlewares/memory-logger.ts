import { NextFunction, Request, Response } from "express";

const formatMemoryUsage = () => {
  const used = process.memoryUsage();

  return {
    rssMb: Math.round(used.rss / 1024 / 1024),
    heapTotalMb: Math.round(used.heapTotal / 1024 / 1024),
    heapUsedMb: Math.round(used.heapUsed / 1024 / 1024),
    externalMb: Math.round(used.external / 1024 / 1024),
  };
};

export const memoryLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.on("finish", () => {
    const memory = formatMemoryUsage();

    console.log(
      `[memory] ${req.method} ${req.originalUrl} ${res.statusCode} rss=${memory.rssMb}MB heapUsed=${memory.heapUsedMb}MB heapTotal=${memory.heapTotalMb}MB external=${memory.externalMb}MB`,
    );
  });

  next();
};

export const getFormattedMemoryUsage = formatMemoryUsage;
