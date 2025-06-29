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
    // node.warn("Cleared existing prolongedPresenceTimer"); // 除錯用，可視需要啟用
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
    // 如果有其他時段，或者不符合上述條件，可以考慮預設動作或 debug
    else {
        node.status({ fill: "grey", shape: "dot", text: "其他未定義時段有人" });
    }
    return outputs; // 有人時，立即返回燈光開啟指令
} else if (msg.payload === 'off') {
    // 偵測到「無人」狀態時，啟動關燈防抖動計時器
    // 如果已經有計時器在跑，則不重複啟動，繼續等待現有的計時器。
    node.status({ fill: "red", shape: "dot", text: "書桌走道無人 - 10秒後嘗試關燈" });
    // outputs[2]: 無人觸發 (延遲 10 秒防抖動)
    NoOneTimer = setTimeout(function () {
        outputs[2] = { payload: "on_outputs[3]", topic: msg.topic };
        node.send(outputs);
        // 計時器執行完畢後，清除 flow context 中的計時器 ID
        flow.set('NoOneTimer', null);
        node.status({ fill: "red", shape: "dot", text: "書桌走道無人 - 已關燈" });
    }, 10000); // 10000 毫秒 = 10 秒延遲
    flow.set('NoOneTimer', NoOneTimer); // 將計時器ID存入 flow context
    // 這裡不立即返回 outputs，因為關燈信號在延遲後才發送
    return [null, null, null, null]; // 延遲發送，所以此處不返回任何訊息
} else {
    // 如果收到了未知狀態，例如 Join 節點未完成，或者感測器狀態不是 'on'/'off'
    node.status({ fill: "orange", shape: "dot", text: `未知狀態: ${msg.payload}` });
    // 清除計時器以防萬一
    flow.set('NoOneTimer', null);
    return null; // 不發送任何訊息
}