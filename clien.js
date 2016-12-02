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

/**
 * [exports description]
 * @param  {[type]} robot [description]
 * @return {[type]}       [description]
 */
module.exports = function(robot) {
    robot.hear(/hotdeal del(.*)/i, function(msg) {
      log.debug('request', {
        message: msg.message.text,
        user: msg.message.user.name,
        channel: msg.message.user.room,
      });

      var arg = msg.message.text.split(' ');
      log.debug('arg.length = ' + arg.length);
      for (var i = 0; i < arg.length; i++) {
        log.debug('arg[' + i + '] = ' + arg[i]);
      }
      var removedKey = keywords[arg[2]];
      var sendText = '';
      if (removedKey) {
        keywords.splice(arg[2], 1);
        // 파일에저장한다.
        fs.writeFileSync(context + 'keywords', JSON.stringify(keywords));
        log.debug('핫딜 키워드 저장정보 = ' + util.inspect(keywords));
        sendText = '`' + removedKey + '` 키워드가 제거되었습니다';
      } else {
        sendText = '잘못된 요청입니다';
      }

      var sendMsg = '';

      if (keywords.length === 0) {
        sendMsg = '검색 키워드가 없습니다';
      } else {
        _.each(keywords, function(item, index) {
            sendMsg += '`' + item + '` ';
          });
      }

      msg.send({
          attachments: [{
              fallback: sendText,
              // "title": "키워드가 추가되었습니다",
              // "pretext": "trlogbot 사용법",
              text: sendText,
              fields: [{
                  title: '검색 키워드',
                  value: sendMsg,
                  short: false,
                },],
              mrkdwn_in: ['text', 'pretext', 'fields'],
              color: 'good',
            },],
          as_user: true,
          username: 'genie',
        });
    });

    robot.hear(/hotdeal add(.*)/i, function(msg) {
        log.debug('request', {
            message: msg.message.text,
            user: msg.message.user.name,
            channel: msg.message.user.room,
          });

        var arg = msg.message.text.split(' ');
        log.debug('arg.length = ' + arg.length);
        for (var i = 0; i < arg.length; i++) {
          log.debug('arg[' + i + '] = ' + arg[i]);
        }

        keywords.push(arg[2]);
        // 파일에저장한다.
        fs.writeFileSync(context + 'keywords', JSON.stringify(keywords));
        log.debug('핫딜 키워드 저장정보 = ' + util.inspect(keywords));

        var sendMsg = '';

        if (keywords.length === 0) {
          sendMsg = '검색 키워드가 없습니다';
        } else {
          _.each(keywords, function(item, index) {
              sendMsg += '`' + item + '` ';
            });
        }

        msg.send({
            attachments: [{
                // "title": "키워드가 추가되었습니다",
                // "pretext": "trlogbot 사용법",
                text: '`' + arg[2] + '` 키워드가 추가되었습니다',
                fallback: '검색 키워드',
                fields: [{
                    title: '검색 키워드',
                    value: sendMsg,
                    short: false,
                  },],
                mrkdwn_in: ['text', 'pretext', 'fields'],
                color: 'good',
              },],
            as_user: true,
            username: 'genie',
          });
      });

    robot.hear(/hotdeal keyword$/i, function(msg) {
        log.debug('request', {
            message: msg.message.text,
            user: msg.message.user.name,
            channel: msg.message.user.room,
          });

        var sendMsg = '';

        if (keywords.length === 0) {
          sendMsg = '검색 키워드가 없습니다';
        } else {
          _.each(keywords, function(item, index) {
              sendMsg += '`' + item + '` ';
            });
        }

        msg.send({
            attachments: [{
                fallback: '핫딜 검색 키워드',
                fields: [{
                    title: '핫딜 검색 키워드',
                    value: sendMsg,
                    short: false,
                  },],
                mrkdwn_in: ['text', 'pretext', 'fields'],
                color: 'good',
              },],
            as_user: true,
            username: 'genie',
          });
      });

    robot.hear(/hotdeal$/i, function(msg) {
        log.debug('request', {
            message: msg.message.text,
            user: msg.message.user.name,
            channel: msg.message.user.room,
          });

        msg.send({
            attachments: [{
                fallback: '핫딜봇을 사용한다',
                // "title": "trlog get {전화번호}",
                pretext: ' *hotdeal bot* ',
                fields: [{
                    // "title": "사용법",
                    value: '핫딜봇을 사용한다',
                    short: false,
                  }, {
                    title: '사용법',
                    value: 'hotdeal { `keyword` | `add` | `del` }',
                    short: false,
                  }, {
                    title: '핫딜 키워드 보기',
                    value: '```hotdeal keyword\n>>> 핫딜 검색 키워드 \n' +
                      ' `항공` `드롱기` `네스프레소` `일본` `이벤트````',
                    short: false,
                  }, {
                    title: '핫딜 키워드 추가하기',
                    value: '```hotdeal add 아이폰\n>>> `아이폰` ' +
                      '키워드가 추가되었습니다 \n 검색 키워드\n `항공` `드롱기`' +
                      ' `네스프레소` `일본` `이벤트` `아이폰` ```',
                    short: false,
                  }, {
                    title: '핫딜 키워드 제거하기',
                    value: '```hotdeal del 5\n>>> `아이폰` 키워드가 제거되었습니다 ' +
                      '\n 검색 키워드\n `항공` `드롱기` `네스프레소` `일본` ' +
                      '`이벤트` ```',
                    short: false,
                  },],
                mrkdwn_in: ['text', 'pretext', 'fields'],
                color: 'good',
              },],
            as_user: true,
            username: 'genie',
          });
      });
  };
