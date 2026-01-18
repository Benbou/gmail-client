import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    transport: isProduction
        ? undefined
        : {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
              },
          },
    base: {
        env: process.env.NODE_ENV || 'development',
    },
});

// Child loggers for specific modules
export const createLogger = (module: string) => logger.child({ module });

// Request logger middleware
export const requestLogger = () => {
    return (req: any, res: any, next: any) => {
        const start = Date.now();
        const requestId = crypto.randomUUID();

        req.requestId = requestId;
        req.log = logger.child({ requestId });

        res.on('finish', () => {
            const duration = Date.now() - start;
            const logData = {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
            };

            if (res.statusCode >= 500) {
                req.log.error(logData, 'Request failed');
            } else if (res.statusCode >= 400) {
                req.log.warn(logData, 'Request error');
            } else {
                req.log.info(logData, 'Request completed');
            }
        });

        next();
    };
};

export default logger;
