/**
 * author : @nadir93
 */
var loglevel = 'debug';
var Logger = require('bunyan'),
    log = new Logger.createLogger({
        name: 'hotdealbot',
        level: loglevel
    });

var request = require('request'),
    url = require('url'),
    util = require('util'),
    fs = require('fs'),
    cheerio = require('cheerio'),
    schedule = require('node-schedule'),
    _ = require('underscore');

// var RtmClient = require('@slack/client').RtmClient;
// var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

//var token = process.env.HUBOT_SLACK_TOKEN;
// var autoMark, autoReconnect, slack;
//
// var rtm = new RtmClient(token, {
//   logLevel: 'debug',
//   autoReconnect: true,
//   // Boolean indicating whether each message should be marked as read or not after it is processed
//   autoMark: true
// });
// rtm.start();
//
// rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
//   log.debug('Message = ', message);
//
//   // rtm.sendMessage('test!!!', 'C1ERLEF7X', function (err, res) {
//   //   //expect(err).to.not.equal(null);
//   //   //expect(res).to.equal(null);
//   //   //done();
//   // });
// });
//
// rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
//   log.debug('Reaction added = ', reaction);
// });
//
// rtm.on(RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
//   log.debug('Reaction removed = ', reaction);
// });

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
    fs.accessSync(context + 'hotdeals', fs.F_OK);
    // Do something
} catch (e) {
    // It isn't accessible
    log.error('file access error = ' + e);
    fs.writeFileSync(context + 'hotdeals', "{}");
}

var hotdealData = fs.readFileSync(context + 'hotdeals', 'utf8');
log.debug('hotdealData = ' + hotdealData);
var hotdeals = JSON.parse(hotdealData);
log.debug('기존 파일 핫딜 데이타 = ' + util.inspect(hotdeals));

try {
    fs.accessSync(context + 'keywords', fs.F_OK);
    // Do something
} catch (e) {
    // It isn't accessible
    log.error('file access error = ' + e);
    fs.writeFileSync(context + 'keywords', "[]");
}

var keywordsData = fs.readFileSync(context + 'keywords', 'utf8');
var keywords = JSON.parse(keywordsData);
log.debug('기존 파일 핫딜 키워드 = ' + util.inspect(keywords));
//var keywords = ['항공', '드롱기', '네스프레소', '일본', '이벤트'];

//nadir direct channel
//var sendChannel = 'D1EQ5GGH4';
// hotdeal channel
var sendChannel = 'C1ERLEF7X';

/**
 * 1분마다 핫딜정보 체크
 */
schedule.scheduleJob('*/1 * * * *', function() {
    checkHotdeals(pushHotdeals);
})

/**
 * 핫딜정보를 체크한다.
 * @param callback
 */
function checkHotdeals(callback) {
    log.debug('핫딜정보 체크시작');
    //잠자는 사간 제외
    var now = new Date();
    log.debug(now.getHours() + '시 입니다');
    if (0 < now.getHours() && now.getHours() < 8) {
        log.debug('취침시간입니다...');
        log.debug('핫딜정보 체크종료');
        return;
    }

    //오늘날짜의 딜정보를 가져온다.
    request({
        uri: 'http://www.clien.net/cs2/bbs/board.php?bo_table=jirum'
    }, function(err, response, body) {
        if (err) {
            log.error('웹 스크래핑 중 에러발생', err);
            return;
        }

        log.debug('response.statusCode=' + response.statusCode);

        $ = cheerio.load(body, {
            normalizeWhitespace: true,
            xmlMode: true
        });

        $('tr').each(function() {
            //console.log('레코드정보=' + $(this).html());
            var $this = $(this);

            var key;
            var category;
            var title;
            var uri;
            var writer;
            var time;
            var count;

            $this.children('td').each(function(index) {
                //console.log('index=' + index);

                switch (index) {
                    case 0:
                        key = $(this).text();
                        break;
                    case 1:
                        category = $(this).text();
                        break;
                    case 2:
                        title = $(this).text().substr(12);
                        //http://www.clien.net/cs2/bbs/board.php?bo_table=jirum&wr_id=399223
                        var tmp = '' + $(this).children('a').attr('href');
                        //console.log('str=' + str);
                        //console.log('strTypeOf=' + typeof str);
                        uri = 'http://www.clien.net/cs2/' + (tmp.substr(3));
                        //console.log('uri=' + uri);
                        break;
                    case 3:
                        writer = $(this).text();
                        break;
                    case 4:
                        time = $(this).text();
                        break;
                    case 5:
                        count = $(this).text();

                        //오늘날짜 항목일경우 추가
                        if (time.indexOf(':') > 0) {
                            if (hotdeals.hasOwnProperty(key)) {
                                //이미있는항목일경우 조회수 업데이트
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
                                    date: now.getDate()
                                };
                            }
                        } else {
                            //  날짜가 지난 아이템 삭제
                            log.debug((hotdeals.hasOwnProperty(key) ? "존재합니다 키 = " : "존재하지 않습니다 키 = ") + key);
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
        log.debug('핫딜 정보 = ' + util.inspect(hotdeals));
        callback(response, hotdeals);
    });
    log.debug('핫딜정보 체크종료');
}

/**
 * 등록된 사용자에게 핫딜정보를 푸시한다.
 * @param response
 * @param deals
 */
function pushHotdeals(response, deals) {
    log.debug('pushHotdeals시작(response = ' + response.statusCode + '| deals = ' + util.inspect(deals) + ')');
    var now = new Date();

    /**
     * 로직 : 조회수3000건이상 추후 로직을 적용바람 ex) 단위 시간당 조회수를 기울기로 환산하여 임계치 이상이면 핫딜로 판단..
     */
    for (var key in deals) {

        log.debug('key = ' + key);
        log.debug('count = ' + deals[key].count);
        log.debug('title = ' + deals[key].title);

        //슬랙을 통해 키워드를 추가하고 키워드 기반으로 검색 가능하게 변경 해야함

        var replyCount = 0;
        if (deals[key].title.slice(-1) == ']') {
            replyCount = deals[key].title.substring(deals[key].title.lastIndexOf("[") + 1, deals[key].title.lastIndexOf("]"));
            log.debug('replyCount = ' + replyCount);
        }

        var keywordExist = false;
        keywordExist = _.some(keywords, function(item) {
            log.debug('item = ' + item);
            log.debug('exist = ' + (deals[key].title.indexOf(item) > 0));
            return deals[key].title.indexOf(item) > 0;
        });
        log.debug('keywordExist = ' + keywordExist);

        //TODO 키워드 작업해야함
        if ((deals[key].count >= 3000 &&
                deals[key].title.indexOf('품절') < 0 &&
                deals[key].title.indexOf('종료') < 0 &&
                deals[key].title.indexOf('마감') < 0) ||
            (replyCount > 20 &&
                deals[key].title.indexOf('품절') < 0 &&
                deals[key].title.indexOf('종료') < 0 &&
                deals[key].title.indexOf('마감') < 0) ||
            keywordExist) {
            //보낼 메시지 조립
            var sendMsg = deals[key].category + " " + deals[key].title + " " + deals[key].uri;
            var category = deals[key].category;
            var title = deals[key].title;
            var uri = deals[key].uri;
            // {
            //   "notification": {
            //     "notificationStyle": 2,
            //     "contentTitle": "오늘의핫딜" + deals[key].category,
            //     "contentText": deals[key].title,
            //     "ticker": deals[key].title,
            //     "summaryText": "오늘의핫딜" + deals[key].category,
            //     "image": images[0],
            //     contentUri: deals[key].uri
            //   }
            // };

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
                            // attachments: [{
                            //     "fallback": title,
                            //     //"pretext": " *" + title + "* ",
                            //     //"image_url": imageCallbackUrl + filename,
                            //     "title": title,
                            //     "title_link": uri,
                            //     "fields": [{
                            //         "title": "조회수",
                            //         "value": deals[key].count,
                            //         "short": true
                            //     }, {
                            //         "title": "댓글수",
                            //         "value": replyCount,
                            //         "short": true
                            //     }],
                            //     "mrkdwn_in": ["text", "pretext", "fields"],
                            //     "color": "good"
                            // }],
                            // {
                            "text": "<" + uri + "|" + title + ">",
                            "unfurl_links": true,
                            as_user: true,
                            username: "genie"
                        };
                        sendMessage(sendChannel, null, data);

                        // //client.publish('user/' + userKey, JSON.stringify(sendMsg), {'qos': 2});
                        // rtm.sendMessage(sendMsg, 'C1ERLEF7X', function(err, res) {
                        //     //expect(err).to.not.equal(null);
                        //     //expect(res).to.equal(null);
                        //     //done();
                        //
                        // });
                        deals[key].pushed.push(userKey);
                    }
                } else {
                    //최초메시지푸시
                    log.debug('sendMessage = ' + sendMsg /*JSON.stringify(sendMsg)*/ );
                    //client.publish('user/' + userKey, JSON.stringify(sendMsg), {'qos': 2});
                    // rtm.sendMessage(sendMsg, 'C1ERLEF7X', function(err, res) {
                    //     //expect(err).to.not.equal(null);
                    //     //expect(res).to.equal(null);
                    //     //done();
                    // });
                    var data = {
                        "fallback": "<" + uri + "|" + title + ">",
                        // attachments: [{
                        //     "fallback": title,
                        //     //"pretext": " *" + title + "* ",
                        //     //"image_url": imageCallbackUrl + filename,
                        //     "title": title,
                        //     "title_link": uri,
                        //     "fields": [{
                        //         "title": "조회수",
                        //         "value": deals[key].count,
                        //         "short": true
                        //     }, {
                        //         "title": "댓글수",
                        //         "value": replyCount,
                        //         "short": true
                        //     }],
                        //     "mrkdwn_in": ["text", "pretext", "fields"],
                        //     "color": "good"
                        // }],
                        // {
                        "text": "<" + uri + "|" + title + ">",
                        "unfurl_links": true,
                        as_user: true,
                        username: "genie"
                    };
                    sendMessage(sendChannel, null, data);

                    deals[key].pushed = [userKey];
                }
            }
        }
        //가비지 삭제
        if (deals[key].date != now.getDate()) {
            delete deals[key];
            log.debug('비정상 데이타가 삭제되었습니다. 키 = ' + key);
        }
    }
    //파일에저장한다.
    fs.writeFileSync(context + 'hotdeals', JSON.stringify(deals));
    log.debug('핫딜 저장정보 = ' + util.inspect(deals));
    log.debug('pushHotdeals 종료()');
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
            channel: msg.message.user.room
        });

        var arg = msg.message.text.split(' ');
        log.debug('arg.length = ' + arg.length);
        for (var i = 0; i < arg.length; i++) {
            log.debug('arg[' + i + '] = ' + arg[i]);
        }
        var removedKey = keywords[arg[2]];
        var sendText = "";
        if (removedKey) {
            keywords.splice(arg[2], 1);
            //파일에저장한다.
            fs.writeFileSync(context + 'keywords', JSON.stringify(keywords));
            log.debug('핫딜 키워드 저장정보 = ' + util.inspect(keywords));
            sendText = "`" + removedKey + "` 키워드가 제거되었습니다"
        } else {
            sendText = "잘못된 요청입니다"
        }

        var sendMsg = '';

        if (keywords.length == 0) {
            sendMsg = '검색 키워드가 없습니다';
        } else {
            _.each(keywords, function(item, index) {
                sendMsg += '`' + item + '` '
            });
        }

        msg.send({
            "attachments": [{
                "fallback": sendText,
                //"title": "키워드가 추가되었습니다",
                //"pretext": "trlogbot 사용법",
                "text": sendText,
                "fallback": "검색 키워드",
                "fields": [{
                    "title": "검색 키워드",
                    "value": sendMsg,
                    "short": false
                }],
                "mrkdwn_in": ["text", "pretext", "fields"],
                "color": "good"
            }],
            as_user: true,
            username: "genie"
        });
    });

    robot.hear(/hotdeal add(.*)/i, function(msg) {

        log.debug('request', {
            message: msg.message.text,
            user: msg.message.user.name,
            channel: msg.message.user.room
        });

        var arg = msg.message.text.split(' ');
        log.debug('arg.length = ' + arg.length);
        for (var i = 0; i < arg.length; i++) {
            log.debug('arg[' + i + '] = ' + arg[i]);
        }

        keywords.push(arg[2]);
        //파일에저장한다.
        fs.writeFileSync(context + 'keywords', JSON.stringify(keywords));
        log.debug('핫딜 키워드 저장정보 = ' + util.inspect(keywords));

        var sendMsg = '';

        if (keywords.length == 0) {
            sendMsg = '검색 키워드가 없습니다';
        } else {
            _.each(keywords, function(item, index) {
                sendMsg += '`' + item + '` '
            });
        }

        msg.send({
            "attachments": [{
                //"title": "키워드가 추가되었습니다",
                //"pretext": "trlogbot 사용법",
                "text": "`" + arg[2] + "` 키워드가 추가되었습니다",
                "fallback": "검색 키워드",
                "fields": [{
                    "title": "검색 키워드",
                    "value": sendMsg,
                    "short": false
                }],
                "mrkdwn_in": ["text", "pretext", "fields"],
                "color": "good"
            }],
            as_user: true,
            username: "genie"
        });
    });

    robot.hear(/hotdeal keyword$/i, function(msg) {

        log.debug('request', {
            message: msg.message.text,
            user: msg.message.user.name,
            channel: msg.message.user.room
        });

        var sendMsg = '';

        if (keywords.length == 0) {
            sendMsg = '검색 키워드가 없습니다';
        } else {
            _.each(keywords, function(item, index) {
                sendMsg += '`' + item + '` '
            });
        }

        msg.send({
            "attachments": [{
                //"title": "trlog get {전화번호}",
                //"pretext": "trlogbot 사용법",
                //"text": "```ex) trlog get 821021805043\n response : TRLog 전송 요청이 완료되었습니다```",
                "fallback": "핫딜 검색 키워드",
                "fields": [{
                    "title": "핫딜 검색 키워드",
                    "value": sendMsg,
                    "short": false
                }],
                "mrkdwn_in": ["text", "pretext", "fields"],
                "color": "good"
            }],
            as_user: true,
            username: "genie"
        });
    });

    robot.hear(/hotdeal$/i, function(msg) {

        log.debug('request', {
            message: msg.message.text,
            user: msg.message.user.name,
            channel: msg.message.user.room
        });

        //var resMsg = "redis get [key] \nex) redis get user:+821021804709\n --> {\"token\":\"a0b285aa4fba490793a80ee\",\"mqttbroker\":\"mqttbroker:clusterB\",\"created\":\"2016-08-17T02:28:23.621Z\",\"clearedSubscriptions\":\"2016-08-17T02:29:00.348Z\"}\n\nex) redis get mqttbroker:clusterA\n --> {\"token\":\"0123456789\",\"mqttbroker\":[\"ssl://14.63.217.141:18831\",\"ssl://14.63.217.141:28831\"],\"created\":\"2016-08-17T01:38:27.142Z\"}\n\nredis stat\n\n ex) redis stat\n --> clusterB,1,clusterA,1,clusterD,0,clusterC,0";
        msg.send({
            "attachments": [{
                "fallback": "핫딜봇을 사용한다",
                //"title": "trlog get {전화번호}",
                "pretext": " *hotdeal bot* ",
                //"text": "```ex) trlog get 821021805043\n response : TRLog 전송 요청이 완료되었습니다```",
                "fields": [{
                    //"title": "사용법",
                    "value": "핫딜봇을 사용한다",
                    "short": false
                }, {
                    "title": "사용법",
                    "value": "hotdeal { `keyword` | `add` | `del` }",
                    "short": false
                }, {
                    "title": "핫딜 키워드 보기",
                    "value": "```hotdeal keyword\n>>> 핫딜 검색 키워드 \n `항공` `드롱기` `네스프레소` `일본` `이벤트````",
                    "short": false
                }, {
                    "title": "핫딜 키워드 추가하기",
                    "value": "```hotdeal add 아이폰\n>>> `아이폰` 키워드가 추가되었습니다 \n 검색 키워드\n `항공` `드롱기` `네스프레소` `일본` `이벤트` `아이폰` ```",
                    "short": false
                }, {
                    "title": "핫딜 키워드 제거하기",
                    "value": "```hotdeal del 5\n>>> `아이폰` 키워드가 제거되었습니다 \n 검색 키워드\n `항공` `드롱기` `네스프레소` `일본` `이벤트` ```",
                    "short": false
                }],
                "mrkdwn_in": ["text", "pretext", "fields"],
                "color": "good"
            }],
            as_user: true,
            username: "genie"
        });
    });

}

