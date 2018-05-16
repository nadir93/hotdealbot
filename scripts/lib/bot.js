/**
 * Author : @nadir93
 */
// require('newrelic');
const _ = require('underscore');
const util = require('util');

const loglevel = 'debug';
const Logger = require('bunyan');

const log = new Logger.createLogger({
  name: 'bot',
  level: loglevel,
});

const redis = require('redis').createClient(process.env.REDIS_URL);

redis.on('error', err => log.debug(`Error ${err}`));
redis.on('ready', () => log.debug('redis ready'));
redis.on('connect', () => log.debug('redis connect'));
redis.on('reconnecting', obj => log.debug(`redis reconnecting: ${obj}`));
redis.on('end', () => log.debug('redis end'));

function del(msg) {
  log.debug('request', {
    message: msg.message.text,
    user: msg.message.user.name,
    channel: msg.message.user.room,
  });

  const arg = msg.message.text.split(' ');
  log.debug(`arg.length: ${arg.length}`);
  for (let i = 0; i < arg.length; i += 1) {
    log.debug(`arg[${i}]: ${arg[i]}`);
  }

  redis.get('keywords', (err, reply) => {
    // reply is null when the key is missing
    log.debug(`reply: ${reply}`);
    let data;
    if (reply) {
      data = JSON.parse(reply);
    } else {
      data = [];
    }

    const removedKey = data[arg[2]];
    let sendText = '';
    if (removedKey) {
      data.splice(arg[2], 1);
      redis.set('keywords', JSON.stringify(data));
      log.debug(`핫딜 키워드 저장정보: ${util.inspect(data)}`);
      sendText = `\`${removedKey}\` 키워드가 제거되었습니다`;
    } else {
      sendText = '잘못된 요청입니다';
    }

    let sendMsg = '';

    if (data.length === 0) {
      sendMsg = '검색 키워드가 없습니다';
    } else {
      _.each(data, (item) => {
        sendMsg += `\`${item}\` `;
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
        }],
        mrkdwn_in: ['text', 'pretext', 'fields'],
        color: 'good',
      }],
      as_user: false,
      icon_url: 'https://lh6.ggpht.com/4TjZjDRkYz-uoBeNSBH5h7A1S5oSdQvULSyvNAjmN6XWM3M9I5N_M-oQt1I3lDAiUtQ=w300',
      username: '클리앙',
    });
  });
}

function add(msg) {
  log.debug('request', {
    message: msg.message.text,
    user: msg.message.user.name,
    channel: msg.message.user.room,
  });

  const arg = msg.message.text.split(' ');
  log.debug(`arg.length: ${arg.length}`);
  for (let i = 0; i < arg.length; i += 1) {
    log.debug(`arg[${i}]: ${arg[i]}`);
  }

  redis.get('keywords', (err, reply) => {
    // reply is null when the key is missing
    log.debug(`reply: ${reply}`);
    let data;
    if (reply) {
      data = JSON.parse(reply);
      data.push(arg[2]);
    } else {
      data = [];
      data.push(arg[2]);
    }

    redis.set('keywords', JSON.stringify(data));
    log.debug(`핫딜 키워드 저장정보: ${util.inspect(data)}`);

    let sendMsg = '';

    if (data.length === 0) {
      sendMsg = '검색 키워드가 없습니다';
    } else {
      _.each(data, (item) => {
        sendMsg += `\`${item}\` `;
      });
    }

    msg.send({
      attachments: [{
        // "title": "키워드가 추가되었습니다",
        // "pretext": "trlogbot 사용법",
        text: `\`${arg[2]}\` 키워드가 추가되었습니다`,
        fallback: '검색 키워드',
        fields: [{
          title: '검색 키워드',
          value: sendMsg,
          short: false,
        }],
        mrkdwn_in: ['text', 'pretext', 'fields'],
        color: 'good',
      }],
      as_user: false,
      icon_url: 'https://lh6.ggpht.com/4TjZjDRkYz-uoBeNSBH5h7A1S5oSdQvULSyvNAjmN6XWM3M9I5N_M-oQt1I3lDAiUtQ=w300',
      username: '클리앙',
    });
  });
}

function get(msg) {
  log.debug('request', {
    message: msg.message.text,
    user: msg.message.user.name,
    channel: msg.message.user.room,
  });

  redis.get('keywords', (err, reply) => {
    // reply is null when the key is missing
    log.debug(`reply: ${reply}`);
    let data;
    if (reply) {
      data = JSON.parse(reply);
    } else {
      data = [];
    }

    let sendMsg = '';

    if (data.length === 0) {
      sendMsg = '검색 키워드가 없습니다';
    } else {
      _.each(data, (item) => {
        sendMsg += `\`${item}\` `;
      });
    }

    msg.send({
      attachments: [{
        fallback: '핫딜 검색 키워드',
        fields: [{
          title: '핫딜 검색 키워드',
          value: sendMsg,
          short: false,
        }],
        mrkdwn_in: ['text', 'pretext', 'fields'],
        color: 'good',
      }],
      as_user: false,
      icon_url: 'https://lh6.ggpht.com/4TjZjDRkYz-uoBeNSBH5h7A1S5oSdQvULSyvNAjmN6XWM3M9I5N_M-oQt1I3lDAiUtQ=w300',
      username: '클리앙',
    });
  });
}

function getInfo(msg) {
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
      }],
      mrkdwn_in: ['text', 'pretext', 'fields'],
      color: 'good',
    }],
    as_user: false,
    icon_url: 'https://lh6.ggpht.com/4TjZjDRkYz-uoBeNSBH5h7A1S5oSdQvULSyvNAjmN6XWM3M9I5N_M-oQt1I3lDAiUtQ=w300',
    username: '클리앙',
  });
}

function clienBot(robot) {
  /**
   * 핫딜 키워드 삭제
   * @type {[type]}
   */
  robot.hear(/hotdeal del(.*)/i, del);

  /**
   * 핫딜 키워드 추가
   * @type {[type]}
   */
  robot.hear(/hotdeal add(.*)/i, add);

  /**
   * 핫딜 키워드 보기
   * @type {[type]}
   */
  robot.hear(/hotdeal keyword$/i, get);

  /**
   * 핫딜 사용법 보기
   * @type {[type]}
   */
  robot.hear(/hotdeal$/i, getInfo);
}

module.exports = clienBot;
