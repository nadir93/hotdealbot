/**
 * Author : @nadir93
 */
require('newrelic');
var util = require('util');
var clien = require('./lib/clienLib');
var bot = require('./lib/clienBotInteractLib');
var schedule = require('node-schedule');
var _ = require('underscore');
var request = require('request');
var loglevel = 'debug';
var Logger = require('bunyan');
var log = new Logger.createLogger({
  name: 'clien',
  level: loglevel,
});

/**
 * 주기적으로 핫딜 체크
 */
schedule.scheduleJob('*/1 * * * *', () => {
  clien.scrape()
    .then((data) => clien.push(data))
    .then(() => log.debug('작업 수행 완료'))
    .catch((e) => log.error('에러발생 = ' + e));
});

/**
 * 1분마다 자기자신 호출
 * prevent service idling
 */
setInterval(function() {
  request(process.env.HUBOT_URL,
    function(error, response, body) {
      log.debug(body); // Show the HTML for the Google homepage.
    });
}, 60000); // every 5 minutes (300000)

/**
 * hubot interface
 * @param  {[type]} robot [description]
 * @return {[type]}       [description]
 */
module.exports = function(robot) {
  /**
   * 핫딜 키워드 삭제
   * @type {[type]}
   */
  robot.hear(/hotdeal del(.*)/i, bot.del);

  /**
   * 핫딜 키워드 추가
   * @type {[type]}
   */
  robot.hear(/hotdeal add(.*)/i, bot.add);

  /**
   * 핫딜 키워드 보기
   * @type {[type]}
   */
  robot.hear(/hotdeal keyword$/i, bot.get);

  /**
   * 핫딜 사용법 보기
   * @type {[type]}
   */
  robot.hear(/hotdeal$/i, bot.getInfo);
};
