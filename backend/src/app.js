
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const SqliteStore = require('connect-sqlite3')(session);

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const adminRoutes = require('./routes/admin'); // NEW

const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');


const requiredEnvVars = ['SESSION_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];

for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    logger.error(`Missing required environment variable: ${v}`);
    process.exit(1);
  }
}

const app = express();


app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// CORS - allow frontend origin only
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? false
      : 'http://localhost:5173',
    credentials: true,
  })
);


app.use(express.json({ limit: '10kb' }));


app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SqliteStore({
      db: 'sessions.db',
      dir: '../database'
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);


app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);


app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});


app.use(errorHandler);

const PORT = process.env.PORT || 3001;


if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(
      `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
    );
  });
}

module.exports = app;
