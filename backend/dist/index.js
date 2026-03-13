"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scheduler_1 = require("./services/scheduler");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = __importDefault(require("pino"));
const express_pino_logger_1 = __importDefault(require("express-pino-logger"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const dishes_1 = __importDefault(require("./routes/dishes"));
const menus_1 = __importDefault(require("./routes/menus"));
const orders_1 = __importDefault(require("./routes/orders"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const workerHealth_1 = __importDefault(require("./routes/workerHealth"));
const customers_1 = __importDefault(require("./routes/customers"));
const orderStream_1 = __importDefault(require("./routes/orderStream"));
const whatsapp_1 = __importDefault(require("./routes/whatsapp"));
const deliveries_1 = __importDefault(require("./routes/deliveries"));
const app = (0, express_1.default)();
const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL || 'info' });
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:3000'];
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use((0, express_pino_logger_1.default)({ logger }));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Mount API routers (prefix /api)
app.use('/api/analytics', analytics_1.default);
app.use('/api/dishes', dishes_1.default);
app.use('/api/menus', menus_1.default);
app.use('/api/orders/stream', orderStream_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/deliveries', deliveries_1.default);
app.use('/api/subscriptions', subscriptions_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/whatsapp', whatsapp_1.default);
const PORT = process.env.PORT || 5000;
app.use('/worker/health', workerHealth_1.default);
(0, scheduler_1.startScheduler)();
app.listen(PORT, () => {
    logger.info(`Backend listening on port ${PORT}`);
});
