
Date.prototype.format = function (fmt) {
  let o = {
    "M+": this.getMonth() + 1,                 //月份
    "d+": this.getDate(),                    //日
    "h+": this.getHours(),                   //小时
    "m+": this.getMinutes(),                 //分
    "s+": this.getSeconds(),                 //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S": this.getMilliseconds()             //毫秒
  };

  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  }

  for (let k in o) {
    if (new RegExp("(" + k + ")").test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    }
  }

  return fmt;
}
const list_count = 50;
const popularTime = 50;
let WebSocketServer = require('ws').Server,
  wss = new WebSocketServer({
    port: 3000, //监听接口
    verifyClient: socketVerify //可选，验证连接函数
  });
function socketVerify(info) {
  console.log(info.origin);
  console.log(info.req.url);
  console.log(info.secure);
  return true;
}
wss.mapWs = {};
wss.chatMsgs = new Array();
wss.mapWord = {};
wss.filterWord = new Array();
wss.initFilter = function initFilter() {
  let fs = require("fs");
  let readLine = require("readline");
  let readObj = readLine.createInterface({
    input: fs.createReadStream("list.txt")
  });

  readObj.on('line', function (line) {
    wss.filterWord.push(line);
  });
  readObj.on('close', function () {
    //console.log('readLine close....');
  });
}
wss.initFilter();
console.log("server init success");
//广播
wss.broadcast = function broadcast(s, ws, msg) {
  if (s == 1 && ws.loginTime) {
    let curTime = new Date();
    let strTime = "";
    strTime = curTime.format("dd") + 'd ';
    strTime += curTime.format("hh") + 'h ';
    strTime += curTime.format("mm") + 'm ';
    strTime += curTime.format("ss") + 's';
    let str = "[" + strTime + "] " + ws.name + ":" + msg;
    wss.chatMsgs.push(str);
    if (wss.chatMsgs.length > list_count) {
      let sliceCount = wss.chatMsgs.length - list_count;
      wss.chatMsgs = wss.chatMsgs.slice(sliceCount);
    }
    wss.clients.forEach(function each(client) {
      client.send(str);

    });
  }

  if (s == 0) {
    client.send(ws.name + "exit chat");
  }
};


wss.parseWord = function parseWord(msg) {

  let strFilter = msg;
  strFilter = strFilter.replace(/\s+/g, "#*$");
  strFilter = strFilter.replace(/\t/g, "#*$");
  strFilter = strFilter.replace(/\,/g, "#*$");
  strFilter = strFilter.replace(/\;/g, "#*$");
  strFilter = strFilter.replace(/\./g, "#*$");

  let list = strFilter.split("#*$");
  let curTime = new Date();
  for (i = 0; i < list.length; ++i) {
    let word = list[i];
    let item = this.mapWord[word];
    if (item) {
      let elapse = (curTime.getTime() - item.time.getTime()) / 1000;
      if (elapse <= popularTime) {
        ++item.count;
      }
      else {
        item.count = 1;
        item.time = curTime;
      }
    }
    else {
      let item = { key: word, count: 1, time: curTime };
      this.mapWord[word] = item;
    }

    for (j = 0; j < wss.filterWord.length; ++j) {
      let findWord = wss.filterWord[j];
      if (word.indexOf(findWord) != -1) {
        let str = "*".repeat(findWord.length);
        msg = msg.replace(new RegExp(findWord, 'g'), str);
      }
    }
  }

  wss.lastMsgTime = curTime;
  this.getPopularWord();
  return msg;
}
function sortBy(field) {
  return (x, y) => {
    return y[field] - x[field];
  }
}
wss.getPopularWord = function getPopularWord() {
  let curTime = new Date();
  let sortArry = new Array();
  for (let key in wss.mapWord) {
    let elapse = (wss.lastMsgTime.getTime() - wss.mapWord[key].time.getTime()) / 1000;
    if (elapse <= popularTime) {
      sortArry.push(wss.mapWord[key]);
    }
  }
  sortArry.sort(sortBy("count"));
  if (sortArry[0] && sortArry[0].key) {
    return sortArry[0].key;
  }
  else {
    return "";
  }
}
// 初始化
wss.on('connection', function (ws) {
  // console.log("在线人数", wss.clients.length);
  //ws.send('你是第' + wss.clients.size + '位');
  let lastMsg = "";
  if (wss.chatMsgs && wss.chatMsgs.length > 0) {
    for (i = 0; i < wss.chatMsgs.length; i++) {
      lastMsg += wss.chatMsgs[i] + ' \n ';
    }
    ws.send(lastMsg);
  }
  // 发送消息
  ws.on('message', function (jsonStr, flags) {
    let msg = jsonStr;
    if (typeof msg != "undefined") {
      let str = msg.substr(0, "/login ".length);
      if ("/login " == str) {
        let name = msg.substring("/login ".length);
        this.loginTime = new Date();
        this.name = name;
        wss.mapWs[name] = this;
        return;
      }
      if ("/popular" == msg) {
        let word = wss.getPopularWord();
        ws.send(word);
        return;
      }
      str = msg.substr(0, "/stats ".length);
      if ("/stats " == str) {
        let name = msg.substring("/stats ".length);
        if ([null, undefined].indexOf(wss.mapWs[name]) == -1) {
          let loginTime = wss.mapWs[name].loginTime;
          let strTime = "";
          strTime = loginTime.format("dd") + 'd ';
          strTime += loginTime.format("hh") + 'h ';
          strTime += loginTime.format("mm") + 'm ';
          strTime += loginTime.format("ss") + 's';
          ws.send(strTime);
        }
        return;
      }
      msg = wss.parseWord(msg);

      wss.broadcast(1, this, msg);
    }
  });
  // 退出聊天
  ws.on('close', function (close) {
    try {
      wss.broadcast(0, this);
    } catch (e) {
      console.log('close');
    }
  });
});