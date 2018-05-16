/**
 * Author : @nadir93
 */
// require('newrelic');
// const client = require('redis').createClient(process.env.REDIS_URL);
// const url = require('url');

const loglevel = 'debug';
const Logger = require('bunyan');
const pusher = require('./pusher');
const scraper = require('./scraper');

const log = new Logger.createLogger({
  name: 'clien',
  level: loglevel,
});

module.exports = {
  push: pusher.push,
  scrape: scraper.scrape,
};
