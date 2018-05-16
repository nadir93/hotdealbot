/**
 * Author: @nadir93
 */
const _ = require('underscore');

const loglevel = 'debug';
const Logger = require('bunyan');
const log = new Logger.createLogger({
  name: 'pusher',
  level: loglevel,
});

const sendChannel = process.env.SEND_CHANNEL;
log.debug(`sendChannel = ${sendChannel}`);

const users = {
  '1c45de7cc1daa896bfd32dc': {
    name: '박택영',
    birth: {},
  },
};

const {
  WebClient,
} = require('@slack/client');

const token = process.env.HUBOT_SLACK_TOKEN;
log.debug(`token = ${token}`);
const web = new WebClient(token);

/**
 * sendMessage
 * @param  {[type]} channel [description]
 * @param  {[type]} msg     [description]
 * @param  {[type]} data    [description]
 * @return {[type]}         [description]
 */
function sendMessage(channel, msg, data) {
  web.chat.postMessage(channel, msg, data, (err, res) => {
    if (err) {
      log.error('web.chat.postMessage', err);
    }
    log.debug(res);
  });
}

/**
 * 등록된 사용자에게 핫딜정보를 푸시한다.
 * @param response
 * @param deals
 */
function push(deals, redis) {
  return new Promise((resolve, reject) => {
    log.debug('push 시작()');
    redis.get('keywords', (err, reply) => {
      if (err) return reject(err);
      // reply is null when the key is missing
      log.debug('reply: ', reply);
      let keywords;
      if (reply) {
        keywords = JSON.parse(reply);
      } else {
        keywords = [];
      }

      const now = new Date();
      for (key in deals) {
        log.debug('key = ' + key);
        log.debug('count = ' + deals[key].count);
        log.debug('reply = ' + deals[key].reply);
        log.debug('title = ' + deals[key].title);

        var keywordExist = false;
        keywordExist = _.some(keywords, item => {
          log.debug('item = ' + item);
          log.debug('exist = ' + (deals[key].title.indexOf(item) > 0));
          return deals[key].title.indexOf(item) > 0;
        });
        log.debug('keywordExist = ' + keywordExist);

        // TODO 키워드 작업해야함
        if ((deals[key].count >= 3000 &&
            deals[key].title.indexOf('품절') < 0 &&
            deals[key].title.indexOf('종료') < 0 &&
            deals[key].title.indexOf('마감') < 0) ||
          (deals[key].reply > 20 &&
            deals[key].title.indexOf('품절') < 0 &&
            deals[key].title.indexOf('종료') < 0 &&
            deals[key].title.indexOf('마감') < 0) ||
          keywordExist) {
          // 보낼 메시지 조립
          var sendMsg = deals[key].category + ' ' +
            deals[key].title + ' ' + deals[key].uri;
          var category = deals[key].category;
          var title = deals[key].title;
          var uri = deals[key].uri;

          for (var userKey in users) {
            // 전송정보업데이트
            if (deals[key].hasOwnProperty('pushed')) {
              var sent = false;
              deals[key].pushed.forEach(element => {
                log.debug('element = ' + element);
                if (userKey == element) {
                  log.debug('이미 전송하였습니다');
                  sent = true;
                }
              });

              // 이미 보낸사용자는 스킵
              if (!sent) {
                log.debug('메시지를 전송합니다');
                sendMessage(sendChannel, null, {
                  fallback: '<' + uri + '|' + title + '>',
                  text: '<' + uri + '|' + title + '>',
                  unfurl_links: true,
                  as_user: true,
                  username: 'genie',
                });
                deals[key].pushed.push(userKey);
              }
            } else {
              // 최초메시지푸시
              log.debug('sendMessage = ' + sendMsg /*JSON.stringify(sendMsg)*/ );
              sendMessage(sendChannel, null, {
                fallback: '<' + uri + '|' + title + '>',
                text: '<' + uri + '|' + title + '>',
                unfurl_links: true,
                as_user: true,
                username: 'genie',
              });
              deals[key].pushed = [userKey];
            }
          }
        }

        // 가비지 삭제
        if (deals[key].date != now.getDate()) {
          delete deals[key];
          log.debug('비정상 데이타가 삭제되었습니다. 키 = ' + key);
        }
      }

      // save hotdeals
      redis.set('hotdeals', JSON.stringify(deals));
      // log.debug('핫딜 저장정보 = ' + util.inspect(deals));
      log.debug('push 종료()');
      return resolve();
    });
  });
}

module.exports = {
  push
}
