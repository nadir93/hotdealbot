/**
 * Author : @nadir93
 */
var util = require('util');
var clien = require('./lib/clienLib');
var schedule = require('node-schedule');

var loglevel = 'debug';
var Logger = require('bunyan');
var log = new Logger.createLogger({
    name: 'hotdealbot',
    level: loglevel,
  });

var hotdeals;
var keywords;

init()
  .then(() =>
    schedule.scheduleJob('*/1 * * * *',
      () => clien.checkHotdeals(hotdeals, keywords, clien.push)))
  .catch(err => log.error(err));

/**
 * [init description]
 * @return {[type]} [description]
 */
function init() {
  return new Promise((resolve, reject) => {
    clien.getHotdeals(__dirname + '/hotdeals')
      .then((data) => {
        // log.debug('hotdeals = ' + data);
        hotdeals = JSON.parse(data);
        log.debug('기존 핫딜 = ' + util.inspect(hotdeals));
        return clien.getKeywords(__dirname + '/keywords');
      })
      .then((data) => {
        // log.debug('keywordsData = ' + data);
        keywords = JSON.parse(data);
        log.debug('기존 키워드 = ' + util.inspect(keywords));
        resolve();
      })
      .catch(err => reject(err));
  });
}
