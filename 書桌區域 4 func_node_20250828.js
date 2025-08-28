// 書桌區域燈光時間判斷，含 10 秒關燈防抖動
// msg.payload: 'Has One' 或 'No One'

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列：
// outputs[0]: 日間有人
// outputs[1]: 夜間有人
// outputs[2]: 清晨有人
// outputs[3]: 無人關燈 (防抖動)
const outputs = [null, null, null, null];

let deskOffTimer = flow.get('deskOffTimer') || null;

// 有人時取消關燈計時器
if (msg.payload.substring(0, 7) === 'Has One') {
  if (deskOffTimer) {
    clearTimeout(deskOffTimer);
    flow.set('deskOffTimer', null);
    node.status({ fill: "green", shape: "dot", text: "有人 - 取消關燈計時" });
  }

  // 夜間 (18:00-01:59)
  if (currentHour >= 18 || currentHour < 2) {
    outputs[1] = msg;
    node.status({ fill: "yellow", shape: "dot", text: "夜間有人" });
  }
  // 日間 (08:30-17:59)
  else if ((currentHour === 8 && currentMinute >= 30) || (currentHour >= 9 && currentHour < 18)) {
    outputs[0] = msg;
    node.status({ fill: "green", shape: "dot", text: "日間有人" });
  }
  // 清晨 (02:00-08:29)
  else if ((currentHour >= 2 && currentHour < 8) || (currentHour === 8 && currentMinute < 30)) {
    outputs[2] = msg;
    node.status({ fill: "blue", shape: "dot", text: "清晨有人" });
  }
  // 其他時段
  else {
    outputs[3] = msg;
    node.status({ fill: "grey", shape: "dot", text: "其他時段有人" });
  }
  return outputs;
}

// 無人時啟動 10 秒關燈計時器
if (msg.payload === 'No One') {
  if (deskOffTimer) {
    clearTimeout(deskOffTimer);
    flow.set('deskOffTimer', null);
  }

  node.status({ fill: "red", shape: "dot", text: "無人 - 10 秒後關燈" });

  deskOffTimer = setTimeout(() => {
    const offOutputs = [null, null, null, { payload: "off", topic: "書桌無人" }];
    node.send(offOutputs);
    flow.set('deskOffTimer', null);
    node.status({ fill: "red", shape: "dot", text: "已關燈" });
  }, 10000);

  flow.set('deskOffTimer', deskOffTimer);

  return [null, null, null, null];

} else {
  node.status({ fill: "orange", shape: "dot", text: "未知: " + msg.payload });
  if (deskOffTimer) {
    clearTimeout(deskOffTimer);
    flow.set('deskOffTimer', null);
  }
  return null;
}
