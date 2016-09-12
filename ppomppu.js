/**
 * author : @nadir93
 */
var loglevel = 'debug';
var Logger = require('bunyan'),
    log = new Logger.createLogger({
        name: 'ppomppubot',
        level: loglevel
    });

var request = require('request'),
    url = require('url'),
    util = require('util'),
    fs = require('fs'),
    cheerio = require('cheerio'),
    schedule = require('node-schedule'),
    _ = require('underscore'),
    Iconv = require('iconv').Iconv;

var WebClient = require('@slack/client').WebClient;
var token = process.env.HUBOT_SLACK_TOKEN;
var web = new WebClient(token);

//var serverIP = '127.0.0.1';
//var port = 1883;
//추후 개인데이타는 암호화 하던가 또는 파일이나 디비에서 가져오도록..
var users = {
    "1c45de7cc1daa896bfd32dc": {
        "name": "박택영",
        "birth": {}
    }
};

// var images = [];
// varhotdealsCheckInterval = 60000;
var context = '/home/nadir93/dev/mybot/res/';

try {
    fs.accessSync(context + 'ppomppu', fs.F_OK);
    // Do something
} catch (e) {
    // It isn't accessible
    log.error('file access error = ' + e);
    fs.writeFileSync(context + 'ppomppu', "{}");
}

var hotdealData = fs.readFileSync(context + 'ppomppu', 'utf8');
log.debug('hotdealData = ' + hotdealData);
var ppomppu = JSON.parse(hotdealData);
log.debug('기존 파일 핫글 데이타 = ' + util.inspect(ppomppu));

// try {
//     fs.accessSync(context + 'keywords', fs.F_OK);
//     // Do something
// } catch (e) {
//     // It isn't accessible
//     log.error('file access error = ' + e);
//     fs.writeFileSync(context + 'keywords', "[]");
// }

// var keywordsData = fs.readFileSync(context + 'keywords', 'utf8');
// var keywords = JSON.parse(keywordsData);
// log.debug('기존 파일 핫딜 키워드 = ' + util.inspect(keywords));
//var keywords = ['항공', '드롱기', '네스프레소', '일본', '이벤트'];

//nadir direct channel
//var sendChannel = 'D1EQ5GGH4';
// hotdeal channel
var sendChannel = 'C1ERLEF7X';

/**
 * 1분마다 핫딜정보 체크
 */
schedule.scheduleJob('*/60 * * * * *', function() {
    checkPPOMPPUHot(pushHot);
});

function eucKrToUtf8(str) {
    var iconv = new Iconv('euc-kr', 'utf-8');
    var buf = new Buffer(str, 'binary');
    return iconv.convert(buf).toString();
}

/**
 * 뽐뿌 핫글을 체크한다
 * @param callback
 */
function checkPPOMPPUHot(callback) {
    log.debug('뽐뿌핫글 체크시작');
    //잠자는 사간 제외
    var now = new Date();
    log.debug(now.getHours() + '시 입니다');
    if (0 < now.getHours() && now.getHours() < 8) {
        log.debug('취침시간입니다...');
        log.debug('뽐뿌핫글 체크종료');
        return;
    }

    //오늘날짜의 딜정보를 가져온다.
    request({
        uri: 'http://www.ppomppu.co.kr/hot.php?category=2&id=ppomppu',
        encoding: 'binary'
    }, function(err, response, body) {
        if (err) {
            log.error('웹 스크래핑 중 에러발생', err);
            return;
        }

        log.debug('response.statusCode = ' + response.statusCode);

        var strContents = new Buffer(body, 'binary')
        var iconv = new Iconv('euc-kr', 'UTF8');
        strContents = iconv.convert(strContents).toString();
        //log.debug('strContents = ' + strContents);
        $ = cheerio.load(strContents, {
            normalizeWhitespace: true,
            xmlMode: true
        });

        $( /*'.board_table > tr'*/ '.line').each(function() {
            //console.log('레코드정보=' + $(this).html());
            var $this = $(this);
            //log.debug('body = ' + $(this).text());
            //$(this).children('a').attr('href');
            //log.debug('this = ' + $this.children('span').children('td'));
            //
            var key;
            var category;
            var title;
            var uri;
            var writer;
            var time;
            var count;

            $this.children('td').each(function(index) {

                switch (index) {
                    case 0:
                        //key = $(this).text();
                        //log.debug('0 = ' + $(this).text());
                        break;
                    case 1:
                        //category = $(this).text();
                        writer = $(this).text();
                        break;
                    case 2:
                        //key = $(this).text();
                        break;
                    case 3:
                        //http: //www.ppomppu.co.kr/zboard/view.php?id=ppomppu&no=258203
                        var tmp = '' + $(this).children('a').attr('href');
                        key = tmp.substr(tmp.indexOf('no=') + 3);
                        log.debug('key = ' + key);
                        uri = 'http://www.ppomppu.co.kr' + tmp;
                        log.debug('uri = ' + uri);
                        var title_original = $(this).text().split('&nbsp;&nbsp;');
                        title = title_original[0].substr(2);
                        log.debug('title = ' + title);
                        count = title_original[1];
                        log.debug('count = ' + count);
                        break;
                    default:
                        log.debug('비정상 케이스입니다 data = ' + $(this).html());
                }
            });

            $this.children('span').children('td').each(function(ind) {
                switch (ind) {
                    case 0:
                        time = $(this).text();
                        log.debug('time = ' + time);
                        //오늘날짜 항목일경우 추가
                        if (time.indexOf(':') > 0) {
                            if (ppomppu.hasOwnProperty(key)) {
                                //이미있는항목일경우 조회수 업데이트
                                ppomppu[key].count = count;
                                ppomppu[key].title = title;
                            } else {
                                ppomppu[key] = {
                                    category: category,
                                    uri: uri,
                                    title: title,
                                    writer: writer,
                                    time: time,
                                    count: count,
                                    date: now.getDate()
                                };
                            }
                        } else {
                            //  날짜가 지난 아이템 삭제
                            log.debug((ppomppu.hasOwnProperty(key) ? "존재합니다 키 = " : "존재하지 않습니다 키 = ") + key);
                            if (ppomppu.hasOwnProperty(key)) {
                                delete ppomppu[key];
                                log.debug('삭제 되었습니다 키 = ' + key);
                            }
                        }
                        break;
                    case 1:
                        // //category = $(this).text();
                        // writer = $(this).text();
                        // log.debug('1 = ' + writer);
                        break;
                    default:
                        log.debug('비정상 케이스입니다 data = ' + $(this).html());
                }
            });
        });
        log.debug('핫글 정보 = ' + util.inspect(ppomppu));
        callback(response, ppomppu);
    });
}

/**
 * 등록된 사용자에게 핫딜정보를 푸시한다.
 * @param response
 * @param deals
 */
function pushHot(response, deals) {
    log.debug('pushHot시작(response = ' + response.statusCode + '| deals = ' + util.inspect(deals) + ')');
    var now = new Date();

    /**
     * 로직 : 조회수3000건이상 추후 로직을 적용바람 ex) 단위 시간당 조회수를 기울기로 환산하여 임계치 이상이면 핫딜로 판단..
     */
    for (var key in deals) {

        log.debug('key = ' + key);
        log.debug('count = ' + deals[key].count);
        log.debug('title = ' + deals[key].title);

        //보낼 메시지 조립
        var sendMsg = deals[key].category + " " + deals[key].title + " " + deals[key].uri;
        var category = deals[key].category;
        var title = deals[key].title;
        var uri = deals[key].uri;

        for (var userKey in users) {
            //전송정보업데이트
            if (deals[key].hasOwnProperty('pushed')) {
                var sent = false;
                deals[key].pushed.forEach(function(element) {
                    log.debug('element = ' + element);
                    if (userKey == element) {
                        log.debug('이미 전송하였습니다');
                        sent = true;
                    }
                });

                //이미 보낸사용자는 스킵
                if (!sent) {
                    log.debug('메시지를 전송합니다');

                    var data = {
                        "fallback": "<" + uri + "|" + title + ">",
                        "text": "<" + uri + "|" + title + ">",
                        "unfurl_links": true,
                        as_user: true,
                        username: "genie"
                    };
                    sendMessage(sendChannel, null, data);
                    deals[key].pushed.push(userKey);
                }
            } else {
                //최초메시지푸시
                log.debug('sendMessage = ' + sendMsg /*JSON.stringify(sendMsg)*/ );
                var data = {
                    "fallback": "<" + uri + "|" + title + ">",

                    "text": "<" + uri + "|" + title + ">",
                    "unfurl_links": true,
                    as_user: true,
                    username: "genie"
                };
                sendMessage(sendChannel, null, data);

                deals[key].pushed = [userKey];
            }
        }

        //가비지 삭제
        if (deals[key].date != now.getDate()) {
            delete deals[key];
            log.debug('비정상 데이타가 삭제되었습니다. 키 = ' + key);
        }
    }

    //파일에저장한다.
    fs.writeFileSync(context + 'ppomppu', JSON.stringify(deals));
    log.debug('핫글 저장정보 = ' + util.inspect(deals));
    log.debug('pushHot 종료()');
}

/**
 * 메시지 보내기
 * @param  {[type]} channel [description]
 * @param  {[type]} msg     [description]
 * @param  {[type]} data    [description]
 * @return {[type]}         [description]
 */
function sendMessage(channel, msg, data) {
    web.chat.postMessage(channel, msg, data, function(err, res) {
        if (err) {
            log.error('web.chat.postMessage', err);
        }
        log.debug(res);
    });
}

