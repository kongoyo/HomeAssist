// Node: 客廳走道燈光控制
// Desc: 根據人體感測器(on/off)與時間，控制燈光。含延遲關燈與持續有人偵測。
// Outputs:
// 0: 日常有人 (09:00-01:59)
// 1: 夜間/清晨有人 (02:00-08:59)
// 2: 持續有人超過5秒 (12:00-01:59)
// 3: 無人 (延遲10秒後觸發)

const now = new Date();
const currentHour = now.getHours();

// 從 flow context 獲取計時器ID
let prolongedPresenceTimer = flow.get('prolongedPresenceTimer');
let noOneTimer = flow.get('noOneTimer');

// --- 輔助函式 ---

// 清除計時器函式
function clearTimer(timer, timerName) {
    if (timer) {
        clearTimeout(timer);
        flow.set(timerName, null);
    }
}

// --- 主要邏輯 ---

if (msg.payload === 'on') {
    // 有人進入：取消「無人延遲關燈」和「持續有人」的計時器
    clearTimer(noOneTimer, 'noOneTimer');
    clearTimer(prolongedPresenceTimer, 'prolongedPresenceTimer');
    
    const outputs = [null, null, null, null];

    // 根據當前時間判斷觸發哪個輸出
    if ((currentHour >= 9 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        // 日常時段
        outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
        node.status({ fill: "green", shape: "dot", text: "日常有人 (09:00-01:59)" });
    } else if (currentHour >= 2 && currentHour < 9) {
        // 夜間/清晨時段
        outputs[1] = { payload: "on_outputs[1]", topic: msg.topic };
        node.status({ fill: "blue", shape: "dot", text: "夜間/清晨有人 (02:00-08:59)" });
    }

    // 在特定時段設定「持續有人」計時器
    if ((currentHour >= 12 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        const newTimer = setTimeout(() => {
            // 計時器觸發時，再次檢查時間以防跨時段
            const hourAtFire = new Date().getHours();
            if ((hourAtFire >= 12 && hourAtFire <= 23) || (hourAtFire >= 0 && hourAtFire < 2)) {
                // 僅發送 output[2]
                node.send([null, null, { payload: "on_outputs[2]", topic: msg.topic }, null]);
                node.status({ fill: "yellow", shape: "dot", text: "持續10秒有人 (12:00-01:59)" });
            }
            flow.set('prolongedPresenceTimer', null); // 計時器觸發後清除
        }, 5000); // 5 秒
        flow.set('prolongedPresenceTimer', newTimer); // 保存計時器ID
    }
    
    // 立即發送「有人」的即時訊號
    return outputs;

} else if (msg.payload === 'off') {
    // 無人觸發：取消「持續有人」計時器
    clearTimer(prolongedPresenceTimer, 'prolongedPresenceTimer');

    // 僅在沒有「無人延遲關燈」計時器時，才啟動一個新的
    if (!noOneTimer) {
        node.status({ fill: "orange", shape: "dot", text: "無人，10秒後關燈" });
        const newTimer = setTimeout(() => {
            // 僅發送 output[3]
            node.send([null, null, null, { payload: "on_outputs[3]", topic: msg.topic }]);
            node.status({ fill: "red", shape: "dot", text: "客廳走道無人 - 已關燈" });
            flow.set('noOneTimer', null); // 計時器觸發後清除
        }, 10000); // 10 秒
        flow.set('noOneTimer', newTimer); // 保存計時器ID
    }
    // 'off' 訊息不立即觸發輸出，等待計時器完成
    return null;

} else {
    // 處理未知 payload
    node.warn(`收到未知的 payload: ${msg.payload}`);
    node.status({ fill: "grey", shape: "ring", text: `未知狀態: ${msg.payload}` });
    // 為安全起見，清除所有計時器
    clearTimer(noOneTimer, 'noOneTimer');
    clearTimer(prolongedPresenceTimer, 'prolongedPresenceTimer');
    return null;
}