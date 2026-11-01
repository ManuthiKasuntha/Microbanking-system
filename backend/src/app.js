const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind a reverse proxy (nginx in docker-compose) the client IP comes from X-Forwarded-For,
// which the login rate limiter needs to tell users apart
if (config.trustProxy) app.set('trust proxy', config.trustProxy);

app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
if (config.logRequests) app.use(morgan('dev'));

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
