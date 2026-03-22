export const getFormattedMemoryUsage = () => {
  const used = process.memoryUsage();

  return {
    rssMb: Math.round(used.rss / 1024 / 1024),
    heapTotalMb: Math.round(used.heapTotal / 1024 / 1024),
    heapUsedMb: Math.round(used.heapUsed / 1024 / 1024),
    externalMb: Math.round(used.external / 1024 / 1024),
  };
};
