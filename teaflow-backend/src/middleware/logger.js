const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.get('user-agent') || '';

  res.on('finish', () => {
    const statusCode = res.statusCode;
    const contentLength = res.get('content-length');
    const responseTime = Date.now() - req.startTime;

    console.log(
      JSON.stringify({
        timestamp,
        method,
        url,
        statusCode,
        contentLength,
        responseTime,
        userAgent,
        userId: req.user?.userId || null,
        shopId: req.user?.shopId || null,
      })
    );
  });

  req.startTime = Date.now();
  next();
};

export default logger;