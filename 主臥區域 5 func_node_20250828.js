// Function Node: 整合主臥區域燈光時間判斷與開關燈邏輯
// msg.payload 來自感應器狀態 ('Has One' 或 'No One')

const NO_ONE_DEBOUNCE_MS = 2000; // 2 秒，用於關燈防抖
// --- 設定常數 ---
const DAILY_START_HOUR = 9;
const NIGHT_START_HOUR = 2;
const NO_ONE_TIMEOUT_MS = 30 * 60 * 1000; // 30 分鐘

// --- 輔助函式 ---
function isDailyHours(hour) {
    // 日常時段: 09:00 - 01:59
    return (hour >= DAILY_START_HOUR && hour <= 23) || (hour >= 0 && hour < NIGHT_START_HOUR);
}

function isNightHours(hour) {
    // 夜間/清晨時段: 02:00 - 08:59
    return hour >= NIGHT_START_HOUR && hour < DAILY_START_HOUR;
}

const now = new Date();
const currentHour = now.getHours();

// outputs[0]: 日常有人 (09:00 - 01:59)
// outputs[1]: 夜間/清晨有人 (02:00 - 08:59)
// outputs[2]: 日常無人
// outputs[3]: 夜間/清晨無人
// outputs[4]: 無人超過30分鐘警告
const outputs = [null, null, null, null, null];

if (msg.payload.startsWith('Has One')) {
    // 有人進入，清除所有計時器
    const longTimer = context.get('noOneLongTimer');
    if (longTimer) {
        clearTimeout(longTimer);
        context.set('noOneLongTimer', null);
    }
    const debounceTimer = context.get('noOneDebounceTimer');
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        context.set('noOneDebounceTimer', null);
        // 狀態更新，告知使用者關燈已被取消
        node.status({ fill: "green", shape: "dot", text: `有人 - 取消關燈 (${now.toLocaleTimeString()})` });
    }

    if (isDailyHours(currentHour)) {
        outputs[0] = { payload: "on_normal", topic: msg.topic }; // 使用 payload "on_normal" 區分
        node.status({ fill: "green", shape: "dot", text: `日常有人 (${now.toLocaleTimeString()})` });
    } else if (isNightHours(currentHour)) {
        outputs[1] = { payload: "on_dim", topic: msg.topic }; // 使用 payload "on_dim" 區分
        node.status({ fill: "yellow", shape: "dot", text: `夜間有人 (${now.toLocaleTimeString()})` });
    } else {
        node.status({ fill: "grey", shape: "dot", text: "主臥未定義時段有人" });
    }
    return outputs; // 有人時，直接返回結果，結束函式

} else if (msg.payload.startsWith('No One')) {
    // 處理「無人超過30分鐘」的長計時器
    if (!context.get('noOneLongTimer')) {
        // 啟動新的30分鐘計時器
        const newTimer = setTimeout(() => {
            // 30分鐘後，發送警告訊息到第5個輸出
            node.send([null, null, null, null, { payload: "no_one_30min", topic: "master_bedroom_alert" }]);
            node.status({ fill: "blue", shape: "dot", text: `主臥無人超過30分鐘 (${new Date().toLocaleTimeString()})` });
            context.set('noOneLongTimer', null); // 計時器觸發後清除自身
        }, NO_ONE_TIMEOUT_MS);
        context.set('noOneLongTimer', newTimer);
    }

    // --- 新增：關燈防抖動邏輯 ---
    // 檢查是否已有「關燈防抖」計時器在運行，若無則啟動
    if (!context.get('noOneDebounceTimer')) {
        node.status({ fill: "red", shape: "ring", text: `無人 - ${NO_ONE_DEBOUNCE_MS / 1000}秒後關燈...` });
        const newDebounceTimer = setTimeout(() => {
            const offOutputs = [null, null, null, null, null];
            // 根據時間段觸發不同的關燈輸出
            if (isDailyHours(currentHour)) {
                offOutputs[2] = { payload: "off", topic: msg.topic };
                node.status({ fill: "red", shape: "dot", text: `日常關燈 (${new Date().toLocaleTimeString()})` });
            } else if (isNightHours(currentHour)) {
                offOutputs[3] = { payload: "off", topic: msg.topic };
                node.status({ fill: "red", shape: "dot", text: `夜間關燈 (${new Date().toLocaleTimeString()})` });
            }
            node.send(offOutputs);
            context.set('noOneDebounceTimer', null); // 計時器觸發後清除
        }, NO_ONE_DEBOUNCE_MS);
        context.set('noOneDebounceTimer', newDebounceTimer);
    }

    return null; // 無人時不立即發送訊息，等待計時器觸發

} else {
    // 如果收到了其他非 'Has One' 或 'No One' 的狀態，例如 sensor 無效或初始化狀態
    node.status({ fill: "orange", shape: "dot", text: "未知狀態: " + msg.payload });
    return null; // 未知狀態不發送任何訊息
}