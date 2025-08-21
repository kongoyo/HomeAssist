// Function Node: 主臥廁所燈光控制邏輯
// input: 米家人體es3
// 4 outputs for function_node:
//   outputs[0]: 日常時段有人觸發 ( 08:30 ~ 01:59)
//   outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 08:29 )
//   outputs[2]: 無人觸發 (延遲 5 秒防抖動)
//   outputs[3]: 持續有人超過 1 分鐘觸發

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出訊息的陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null];

// 新增 bathroomOffTimer 
let bathroomOffTimer = flow.get('bathroomOffTimer') || null;

// 新增 bathroomOnTimer 相關變數
let bathroomOnTimer = flow.get('bathroomOnTimer') || null;
let bathroomOnTimerActive = flow.get('bathroomOnTimerActive') || false;

// --- 核心防抖動邏輯：處理計時器的啟動與取消 ---

if (msg.payload != 'No One') {
    // 偵測到「有人」狀態時，無論如何都要先取消任何正在等待的關燈計時器
    if (bathroomOffTimer) {
        clearTimeout(bathroomOffTimer);
        flow.set('bathroomOffTimer', null); // 清除已取消的計時器 ID
        node.status({ fill: "green", shape: "dot", text: "有人 - 取消關燈計時" });
        // console.log("關燈計時器已取消 (有人)"); // 除錯用
    }

    // --- 新增：持續有人超過 1 分鐘才觸發 outputs[3] ---
    if (!bathroomOnTimerActive) {
        // 尚未啟動 timer，開始計時
        bathroomOnTimer = setTimeout(() => {
            outputs[3] = { payload: "on_outputs[3]", topic: msg.topic };
            node.send(outputs);
            flow.set('bathroomOnTimerActive', false);
            flow.set('bathroomOnTimer', null);
            node.status({ fill: "purple", shape: "dot", text: "持續有人超過 1 分鐘" });
        }, 60000); // 60000 毫秒 = 1 分鐘
        flow.set('bathroomOnTimer', bathroomOnTimer);
        flow.set('bathroomOnTimerActive', true);
        node.status({ fill: "purple", shape: "ring", text: "有人計時中 (1分鐘)" });
    }

    // outputs[0]: 日常時段有人觸發 ( 08:30 ~ 01:59)
    if ((currentHour === 8 && currentMinute >= 30) || (currentHour > 8 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
        node.status({ fill: "green", shape: "dot", text: "日常有人 (08:30-01:59)" });
    } else { 
        // outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 08:29 )
        outputs[1] = { payload: "on_outputs[1]", topic: msg.topic };
        node.status({ fill: "blue", shape: "dot", text: "夜間/清晨有人 (02:00-08:29)" });
    }
    return outputs;
} else if (msg.payload.startsWith('No One')) {
    // 偵測到「無人」狀態時，啟動關燈防抖動計時器
    if (bathroomOffTimer) {
        node.status({ fill: "red", shape: "dot", text: "無人 - 計時器已在運行" });
        return [null, null, null, null];
    }
    node.status({ fill: "red", shape: "dot", text: "主臥廁所無人 - 5秒後嘗試關燈" });
    bathroomOffTimer = setTimeout(() => {
        outputs[2] = { payload: "on_outputs[2]", topic: msg.topic };
        node.send(outputs);
        flow.set('bathroomOffTimer', null);
        node.status({ fill: "red", shape: "dot", text: "主臥廁所無人 - 已關燈" });
    }, 5000);
    flow.set('bathroomOffTimer', bathroomOffTimer);

    // --- 新增：有人 timer 取消 ---
    if (bathroomOnTimer) {
        clearTimeout(bathroomOnTimer);
        flow.set('bathroomOnTimer', null);
        flow.set('bathroomOnTimerActive', false);
        node.status({ fill: "grey", shape: "ring", text: "無人 - 取消有人計時" });
    }

    return [null, null, null, null];
} else {
    node.status({ fill: "orange", shape: "dot", text: `未知狀態: ${msg.payload}` });
    if (bathroomOffTimer) {
        clearTimeout(bathroomOffTimer);
        flow.set('bathroomOffTimer', null);
    }
    // 新增：有人 timer 取消
    if (bathroomOnTimer) {
        clearTimeout(bathroomOnTimer);
        flow.set('bathroomOnTimer', null);
        flow.set('bathroomOnTimerActive', false);
    }
    return null;
}