/**
 * Author: @nadir93
 */
const cheerio = require('cheerio');
const request = require('request');
const util = require('util');

const loglevel = 'debug';
const Logger = require('bunyan');
const log = new Logger.createLogger({
  name: 'scraper',
  level: loglevel,
});

/**
 * Check hotdeal info
 */
function scrape(redis) {
  return new Promise((resolve, reject) => {
    log.info('checkHotdeals 시작()');

    // Skip sleep
    const now = new Date();
    log.info(`${now.getHours()}시 입니다`);
    if (now.getHours() > 0 && now.getHours() < 8) {
      log.info('취침시간입니다...');
      log.info('checkHotdeals 종료()');
      return resolve();
    }

    log.info('웹 스크래핑 시작');
    redis.get('hotdeals', (err, reply) => {
      if (err) {
        log.error('에러발생: ', err);
        return reject(err);
      }
      // reply is null when the key is missing
      // log.debug('reply = ' + reply);
      let hotdeals;
      if (reply) {
        hotdeals = JSON.parse(reply);
      } else {
        hotdeals = {};
      }

      // Get today's hotdeal info
      // http://www.clien.net/cs2/bbs/board.php?bo_table=jirum
      request({
        uri: 'https://www.clien.net/service/board/jirum',
      }, (err, response, body) => {
        if (err) {
          log.error('웹 스크래핑 중 에러발생', err);
          return reject(err);
        }
        log.debug(`response.statusCode: ${response.statusCode}`);

        // log.debug('body = ' + body);
        const $ = cheerio.load(body, {
          normalizeWhitespace: true,
          xmlMode: true,
        });

        $('.list_item.symph_row').each(function (i, elem) {

          //log.debug('레코드정보 = ' + $(this).text());
          const $this = $(this);
          let key;
          let category;
          let title;
          let uri;
          let writer;
          let time;
          let count;
          let reply;

          // log.debug('title = ' + $this.children('.list_title').text());

          // $this
          //   .children('div')
          //   .each(function (index, element) {
          //     //log.debug(`index: ${index}`);
          //     //log.debug(`text: ${$(this).text()}`);

          //     switch (index) {
          //       case 0:
          //         break;
          //       case 1:
          //         break;
          //       case 2:
          //         break;
          //       case 3:
          //         break;
          //       default:
          //         log.error(`비정상 케이스입니다. data: ${$(this).html()}`);
          //     }
          //   })

          $this
            .children('.list_title')
            .children('.list_subject')
            .children('span')
            .each(function (index, element) {

              //log.debug('index: ', index);
              //log.debug('text: ', $(this).text());

              switch (index) {
                case 0:
                  category = $(this).text();
                  log.debug(`category: ${category}`);
                  break;
                case 1:
                  title = $(this).text();
                  log.debug(`title: ${title}`);
                  break;
                default:
                  log.error(`비정상 케이스입니다. data: ${$(this).html()}`);
              }
            })

          $this
            .children('.list_title')
            .children('.list_subject')
            .each(function (index, element) {
              uri = `https://www.clien.net${$(this).attr('href')}`;
              key = uri;
              log.debug(`uri: ${uri}`);
              log.debug(`key: ${key}`);
            })

          $this
            .children('.list_author')
            .children('.nickname')
            .each(function (index, element) {

              const spanLength = $(this).children('span').length;
              //log.debug('span length: ', spanLength);

              if (spanLength > 0) {
                writer = $(this).text();
                log.debug(`writer: ${writer}`);
                return false;
              }

              writer = $(this).children('img').attr('alt');
              log.debug(`writer: ${writer}`);

            })

          $this
            .children('.list_title')
            .children('.list_reply')
            .each(function (index, element) {
              reply = $(this).text();
              log.debug(`reply: ${reply}`);
            })

          $this
            .children('.list_time')
            .children('.time')
            .each(function (index, element) {
              time = $(this).clone().children().remove().end().text();
              log.debug(`time: ${time}`);
            })

          $this
            .children('.list_hit')
            .each(function (index, element) {
              count = $(this).text();
              log.debug(`count: ${count}`);
            })

          // 오늘날짜 항목일경우 추가
          if (time.indexOf(':') > 0) {
            if (hotdeals.hasOwnProperty(key)) {
              // 이미있는항목일경우 조회수 업데이트
              hotdeals[key].count = count;
              hotdeals[key].title = title;
              hotdeals[key].reply = reply;
            } else {
              hotdeals[key] = {
                category,
                uri,
                title,
                writer,
                time,
                count,
                reply,
                date: now.getDate(),
              };
            }
          } else {
            //  날짜가 지난 아이템 삭제
            log.debug((hotdeals.hasOwnProperty(key) ? '존재합니다 key: ' : '존재하지 않습니다 key:') + key);
            if (hotdeals.hasOwnProperty(key)) {
              delete hotdeals[key];
              log.debug(`삭제 되었습니다 key:${key}`);
            }
          }



          // $this
          //   .children('.item')
          //   .children('div')
          //   .each((index) => {
          //     log.debug('index: ', index);
          //     log.debug('text: ', $(this).text());
          //     switch (index) {
          //       case 0:
          //         break;
          //       case 1:
          //         uri = `https://www.clien.net${$(this).children('a').attr('href')}`;
          //         log.debug(`uri: ${uri}`);

          //         title = $(this).children('a').text();
          //         log.debug(`title: ${title}`);

          //         count = $(this).children('.badge-reply').text();
          //         log.debug(`count: ${count}`);
          //         break;
          //       case 2:
          //         key =
          //           uri.substring(uri.lastIndexOf('/') + 1, uri.lastIndexOf('?'));
          //         writer = $(this).children('.list-author.dropdown').text();
          //         category = $(this).children('a').children('span').text();


          //         log.debug(`key: ${key}`);
          //         log.debug(`writer: ${writer}`);
          //         log.debug(`category: ${category}`);
          //         log.debug(`title: ${title}`);
          //         break;
          //       case 3:
          //         time = $(this).clone().children('span').children().remove().end().text();
          //         log.debug(`time: ', ${time}`);

          //         // 오늘날짜 항목일경우 추가
          //         if (time.indexOf(':') > 0) {
          //           if (hotdeals.hasOwnProperty(key)) {
          //             // 이미있는항목일경우 조회수 업데이트
          //             hotdeals[key].count = count;
          //             hotdeals[key].title = title;
          //           } else {
          //             hotdeals[key] = {
          //               category,
          //               uri,
          //               title,
          //               writer,
          //               time,
          //               count,
          //               date: now.getDate(),
          //             };
          //           }
          //         } else {
          //           //  날짜가 지난 아이템 삭제
          //           log.debug((hotdeals.hasOwnProperty(key) ? '존재합니다 key: ' : '존재하지 않습니다 key:') + key);
          //           if (hotdeals.hasOwnProperty(key)) {
          //             delete hotdeals[key];
          //             log.debug(`삭제 되었습니다 key:${key}`);
          //           }
          //         }
          //         break;

          //       default:
          //         log.error(`비정상 케이스입니다. data: ${$(this).html()}`);
          //     }
          //   });
        });

        log.debug(`핫딜 정보: ${util.inspect(hotdeals)}`);
        log.info('checkHotdeals 종료()');
        // push(hotdeals);
        return resolve(hotdeals);
      }); // TODO: replace function
      return undefined;
    });
    return undefined;
  });
}

module.exports = {
  scrape
}
