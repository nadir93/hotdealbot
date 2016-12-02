/**
 * Author : @nadir93
 */
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var _ = require('underscore');
var url = require('url');
var util = require('util');

var loglevel = 'debug';
var Logger = require('bunyan');
var log = new Logger.createLogger({
    name: 'clienLib',
    level: loglevel,
  });

var WebClient = require('@slack/client').WebClient;
var token = process.env.HUBOT_SLACK_TOKEN;
log.debug('token = ' + token);
var web = new WebClient(token);

var sendChannel = process.env.SEND_CHANNEL;
log.debug('sendChannel = ' + sendChannel);
var users = {
  '1c45de7cc1daa896bfd32dc': {
    name: '박택영',
    birth: {},
  },
};

/**
 * [readFile description]
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
function readFile(file)  {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
  });
}
/**
 * [writeFile description]
 * @param  {[type]} file [description]
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
function writeFile(file, data)  {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, data, err => {
        if (err) reject(err);
        resolve(data);
      });
  });
}

function sendMessage(channel, msg, data) {
  web.chat.postMessage(channel, msg, data, function(err, res) {
    if (err) {
      log.error('web.chat.postMessage', err);
    }
    log.debug(res);
  });
}

module.exports = {
  /**
   * [getHotdeals description]
   * @return {[type]} [description]
   */
  getHotdeals: file => {
    return new Promise((resolve, reject) => {
      readFile(file)
        .then(data => resolve(data))
        .catch(err => {
          log.error(err);
          if (err.code === 'ENOENT') {
            log.debug('hotdeals file not found');
            log.debug('create hotdeals file');
            return writeFile(file, '{}');
          }
          reject(err);
        })
        .then((data) => resolve(data))
        .catch(err => {
          log.error(err);
          reject(err);
        });
    });
  },
  /**
   * [getKeywords description]
   * @return {[type]} [description]
   */
  getKeywords: file => {
    return new Promise((resolve, reject) => {
      readFile(file)
        .then((data) => resolve(data))
        .catch(err => {
          log.error(err);
          if (err.code === 'ENOENT') {
            log.debug('keywords file not found');
            log.debug('create keywords file');
            return writeFile(file, '[]');
          }
          reject(err);
        })
        .then((data) => resolve(data))
        .catch(err => {
          log.error(err);
          reject(err);
        });
    });
  },
  /**
   * Check hotdeal info
   * @param callback
   */
  checkHotdeals: (hotdeals, keywords, callback) => {
    log.debug('checkHotdeals 시작()');
    // Skip sleep
    var now = new Date();
    log.debug(now.getHours() + '시 입니다');
    if (0 < now.getHours() && now.getHours() < 8) {
      log.debug('취침시간입니다...');
      log.debug('checkHotdeals 종료()');
      return;
    }

    // Get today's hotdeal info
    request({uri: 'http://www.clien.net/cs2/bbs/board.php?bo_table=jirum'},
      (err, response, body) => {
        if (err) return log.error('웹 스크래핑 중 에러발생', err);
        log.debug('response.statusCode=' + response.statusCode);
        // log.debug('body = ' + body);
        $ = cheerio.load(body, {
          normalizeWhitespace: true,
          xmlMode: true,
        });

        $('tr').each(function() {
          // log.debug('레코드정보 = ' + $(this).html());
          var $this = $(this);
          var key;
          var category;
          var title;
          var uri;
          var writer;
          var time;
          var count;

          $this.children('td').each(function(index) {
            // log.debug('index = ' + index);
            switch (index) {
              case 0:
                key = $(this).text();
                break;
              case 1:
                category = $(this).text();
                break;
              case 2:
                title = $(this).text().substr(12);
                // A http://www.clien.net/cs2/bbs/board.php
                // ?bo_table=jirum&wr_id=399223
                var tmp = '' + $(this).children('a').attr('href');
                // console.log('str=' + str);
                // console.log('strTypeOf=' + typeof str);
                uri = 'http://www.clien.net/cs2/' + (tmp.substr(3));
                // console.log('uri=' + uri);
                break;
              case 3:
                writer = $(this).text();
                break;
              case 4:
                time = $(this).text();
                break;
              case 5:
                count = $(this).text();
                // 오늘날짜 항목일경우 추가
                if (time.indexOf(':') > 0) {
                  if (hotdeals.hasOwnProperty(key)) {
                    // 이미있는항목일경우 조회수 업데이트
                    hotdeals[key].count = count;
                    hotdeals[key].title = title;
                  } else {
                    hotdeals[key] = {
                      category: category,
                      uri: uri,
                      title: title,
                      writer: writer,
                      time: time,
                      count: count,
                      date: now.getDate(),
                    };
                  }
                } else {
                  // 날짜가 지난 아이템 삭제
                  log.debug(
                    (hotdeals.hasOwnProperty(key) ?
                      '존재합니다 키 = ' : '존재하지 않습니다 키 = ') + key);
                  if (hotdeals.hasOwnProperty(key)) {
                    delete hotdeals[key];
                    log.debug('삭제 되었습니다 키 = ' + key);
                  }
                }
                break;
              default:
                log.debug('비정상 케이스입니다 data = ' + $(this).html());
            }
          });
        });
        // log.debug('핫딜 정보 = ' + util.inspect(hotdeals));
        log.debug('checkHotdeals 종료()');
        callback(hotdeals, keywords);
      });
  },
  /**
   * 등록된 사용자에게 핫딜정보를 푸시한다.
   * @param response
   * @param deals
   */
  push: (deals, keywords) => {
    log.debug('push 시작(deals = ' +
        util.inspect(deals) + ', keywords = ' + util.inspect(keywords) + ')');
    var now = new Date();
    for (var key in deals) {
      log.debug('key = ' + key);
      log.debug('count = ' + deals[key].count);
      log.debug('title = ' + deals[key].title);

      var replyCount = 0;
      if (deals[key].title.slice(-1) == ']') {
        replyCount = deals[key]
          .title.substring(deals[key]
          .title.lastIndexOf('[') + 1, deals[key].title.lastIndexOf(']'));
        log.debug('replyCount = ' + replyCount);
      }

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
          (replyCount > 20 &&
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
            log.debug('sendMessage = ' + sendMsg /*JSON.stringify(sendMsg)*/);
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
    // 파일에저장한다.
    fs.writeFileSync(process.cwd() + '/hotdeals', JSON.stringify(deals));
    log.debug('핫딜 저장정보 = ' + util.inspect(deals));
    log.debug('push 종료()');
  },
};
