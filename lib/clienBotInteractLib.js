/**
 * Author : @nadir93
 */
require('newrelic');
var client = require('redis').createClient(process.env.REDIS_URL);
var cheerio = require('cheerio');
var request = require('request');
var _ = require('underscore');
var url = require('url');
var util = require('util');
var loglevel = 'debug';
var Logger = require('bunyan');
var log = new Logger.createLogger({
  name: 'clienBotInteractLib',
  level: loglevel,
});

var redis = require('redis').createClient(process.env.REDIS_URL);

redis.on('error', function(err) {
  log.debug('Error ' + err);
});

redis.on('ready', function() {
  log.debug('redis ready');
});

redis.on('connect', function() {
  log.debug('redis connect');
});

redis.on('reconnecting', function(obj) {
  log.debug('redis reconnecting = ' + util.inspect(obj));
});

redis.on('end', function() {
  log.debug('redis end');
});

module.exports = {
  getInfo: function(msg) {
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
        }, ],
        mrkdwn_in: ['text', 'pretext', 'fields'],
        color: 'good',
      }, ],
      as_user: true,
      username: 'genie',
    });
  },
  get: function(msg) {
    log.debug('request', {
      message: msg.message.text,
      user: msg.message.user.name,
      channel: msg.message.user.room,
    });

    redis.get('keywords', function(err, reply) {
      // reply is null when the key is missing
      log.debug('reply = ' + reply);
      var data;
      if (reply) {
        data = JSON.parse(reply);
      } else {
        data = [];
      }

      var sendMsg = '';

      if (data.length === 0) {
        sendMsg = '검색 키워드가 없습니다';
      } else {
        _.each(data, function(item, index) {
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
          }, ],
          mrkdwn_in: ['text', 'pretext', 'fields'],
          color: 'good',
        }, ],
        as_user: true,
        username: 'genie',
      });
    });
  },
  add: function(msg) {
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

    redis.get('keywords', function(err, reply) {
      // reply is null when the key is missing
      log.debug('reply = ' + reply);
      var data;
      if (reply) {
        data = JSON.parse(reply);
        data.push(arg[2]);
      } else {
        data = [];
        data.push(arg[2]);
      }

      redis.set('keywords', JSON.stringify(data));
      log.debug('핫딜 키워드 저장정보 = ' + util.inspect(data));

      var sendMsg = '';

      if (data.length === 0) {
        sendMsg = '검색 키워드가 없습니다';
      } else {
        _.each(data, function(item, index) {
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
          }, ],
          mrkdwn_in: ['text', 'pretext', 'fields'],
          color: 'good',
        }, ],
        as_user: true,
        username: 'genie',
      });
    });
  },
  del: function(msg) {
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

    redis.get('keywords', function(err, reply) {
      // reply is null when the key is missing
      log.debug('reply = ' + reply);
      var data;
      if (reply) {
        data = JSON.parse(reply);
      } else {
        data = [];
      }

      var removedKey = data[arg[2]];
      var sendText = '';
      if (removedKey) {
        data.splice(arg[2], 1);
        redis.set('keywords', JSON.stringify(data));
        log.debug('핫딜 키워드 저장정보 = ' + util.inspect(data));
        sendText = '`' + removedKey + '` 키워드가 제거되었습니다';
      } else {
        sendText = '잘못된 요청입니다';
      }

      var sendMsg = '';

      if (data.length === 0) {
        sendMsg = '검색 키워드가 없습니다';
      } else {
        _.each(data, function(item, index) {
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
          }, ],
          mrkdwn_in: ['text', 'pretext', 'fields'],
          color: 'good',
        }, ],
        as_user: true,
        username: 'genie',
      });
    });
  }

};
