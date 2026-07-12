'use strict';

require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(JSON.stringify({ level: 'info', message: `TransitOps API running on port ${PORT}`, env: process.env.NODE_ENV }));
});
