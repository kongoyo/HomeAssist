// Function Node: 書桌走道燈光控制邏輯 (加入 10 秒關燈防抖動)
// input: Aqara FP2 人在感測器 ('on' or 'off')
// 3 outputs for function_node:
//   outputs[0]: 日常時段有人觸發 ( 16:00 ~ 01:59 )
//   outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 15:59 )
//   outputs[2]: 無人觸發 (延遲 10 秒防抖動)
const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();
const outputs = [null, null, null]; 
// 清除 NoOneTimer 
let NoOneTimer = flow.get('NoOneTimer') || null;

if (NoOneTimer) {
    clearTimeout(NoOneTimer);
    flow.set('NoOneTimer', null);
}
// --- 計時器取消邏輯結束 ---
if (msg.payload === 'on') {
    // outputs[0]: 日常時段有人觸發 ( 16:00 ~ 01:59 )
    if ((currentHour >= 16 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
        node.status({ fill: "green", shape: "dot", text: "日常有人 (16:00-01:59)" });
    }
    // outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 15:59 )
    else if (currentHour >= 2 && currentHour < 16) {
        outputs[1] = { payload: "on_outputs[1]", topic: msg.topic };
        node.status({ fill: "blue", shape: "dot", text: "夜間/清晨有人 (02:00-15:29)" });
    }
    else {
        node.status({ fill: "grey", shape: "dot", text: "其他未定義時段有人" });
    }
    return outputs;
} else if (msg.payload === 'off') {
    node.status({ fill: "red", shape: "dot", text: "書桌走道無人 - 10秒後嘗試關燈" });
    // outputs[2]: 無人觸發 (延遲 10 秒防抖動)
    NoOneTimer = setTimeout(function () {
        outputs[2] = { payload: "on_outputs[3]", topic: msg.topic };
        node.send(outputs);
        flow.set('NoOneTimer', null);
        node.status({ fill: "red", shape: "dot", text: "書桌走道無人 - 已關燈" });
    }, 10000);
    flow.set('NoOneTimer', NoOneTimer);
    return [null, null, null];
} else {
    node.status({ fill: "orange", shape: "dot", text: `未知狀態: ${msg.payload}` });
    flow.set('NoOneTimer', null);
    return null;
}