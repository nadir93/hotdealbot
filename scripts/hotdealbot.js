/**
 * Author : @nadir93
 */
// require('newrelic');
// const util = require('util');
const clien = require('./lib/clien');
const bot = require('./lib/bot');
const schedule = require('node-schedule');
// const _ = require('underscore');
const request = require('request-promise-native');

const loglevel = 'debug';
const Logger = require('bunyan');

const log = new Logger.createLogger({
  name: 'hotdealbot',
  level: loglevel,
});

const redis = require('redis').createClient(process.env.REDIS_URL);

redis.on('error', err => log.debug(`Error ${err}`));
redis.on('ready', () => log.debug('redis ready'));
redis.on('connect', () => log.debug('redis connect'));
redis.on('reconnecting', obj => log.debug(`redis reconnecting: ${obj}`));
redis.on('end', () => log.debug('redis end'));

/**
 * 주기적으로 핫딜 체크
 */
schedule.scheduleJob('*/1 * * * *', async () => {
  try {
    const data = await clien.scrape(redis);
    await clien.push(data, redis);
    log.debug('작업 수행 완료');
  } catch (e) {
    log.error('에러발생: ', e);
  }
});

/**
 * 1분마다 자기자신 호출
 * prevent service idling
 */
setInterval(() => {
  request(process.env.HUBOT_URL)
    .then(body => log.debug(`health check response: ${body}`))
    .catch((e) => {
      if (e.statusCode === 404) {
        return undefined;
      }
      log.error('error:', e);
      return undefined;
    });
}, 60000); // every 5 minutes (300000)

/**
 * hubot interface
 * @param  {[type]} robot [description]
 * @return {[type]}       [description]
 */
module.exports = bot;
