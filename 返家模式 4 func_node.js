// Function Node: 回家模式控制邏輯
// 根據門鎖開鎖事件與成員定位，判斷是開啟還是關閉離家模式。

// --- 1. 門鎖事件檢查 ---
// 安全地獲取門鎖事件的屬性
const attributes = msg.data?.new_state?.attributes;

// 檢查屬性是否存在
if (!attributes) {
    node.warn("無法讀取門鎖事件屬性 (msg.data.new_state.attributes)，流程中止。");
    node.status({ fill: "red", shape: "ring", text: "無門鎖事件" });
    return null;
}

const opMethod = attributes['Operation Method'];
const opPosition = attributes['Operation Position'];
const lockAction = attributes['Lock Action'];

// 定義有效的開鎖事件
// 門內開鎖 (離家): {'Operation Method': 9, 'Operation Position': 1, 'Lock Action': 2}
const isInternalUnlock = (opMethod === 9 && opPosition === 1 && lockAction === 2);
// 外部開鎖 (返家): {'Operation Position': 2, 'Lock Action': 2}
const isExternalUnlock = (opPosition === 2 && lockAction === 2);

// 如果不是指定的開鎖事件，則中止流程
if (!isInternalUnlock && !isExternalUnlock) {
    const eventText = `Act:${lockAction},Pos:${opPosition},Met:${opMethod || 'N/A'}`;
    node.status({ fill: "grey", shape: "dot", text: `非指定開鎖事件: ${eventText}` });
    return null;
}

// --- 2. 成員定位檢查 (原有邏輯) ---

// 從 msg 中獲取由 get-entities 節點準備好的 device_tracker 陣列
const device_trackers = msg.device_tracker;

// 檢查 `device_trackers` 是否為一個有效的陣列，若否則發出警告並中止。
if (!Array.isArray(device_trackers) || device_trackers.length === 0) {
    node.warn("`msg.device_tracker` 不是一個有效的陣列或為空。請確保上游 Get Entities 節點的輸出類型設定為 'array' 且能正確獲取實體。");
    node.status({ fill: "red", shape: "ring", text: "輸入資料錯誤" });
    return null; // 中止流程
}

// 從陣列中的每個實體物件中，提取 'state' 屬性，組成一個狀態陣列。
const trackerStates = device_trackers.map(entity => entity.state);

// 判斷是否所有成員都不在家
const isEveryoneAway = trackerStates.every(state => state === 'not_home');

// 判斷是否至少有一位成員在家
const isSomeoneHome = trackerStates.some(state => state === 'home');

// --- 3. 模式判斷與輸出 ---
// 準備輸出，預設為不觸發任何流程
// outputs[0]: 有人回家 => 關閉離家模式 (觸發歡迎場景)
// outputs[1]: 全員離家 => 開啟離家模式 (觸發關閉設備場景)
const outputs = [null, null];

if (isEveryoneAway) {
    // 所有成員都不在家，觸發開啟離家模式
    outputs[1] = msg; // 將原始 msg 傳遞到第二個輸出
    node.status({ fill: "red", shape: "dot", text: "開啟離家模式" });
} else if (isSomeoneHome) {
    // 至少有一位成員在家，觸發關閉離家模式
    outputs[0] = msg; // 將原始 msg 傳遞到第一個輸出
    node.status({ fill: "green", shape: "dot", text: "關閉離家模式" });
} else {
    // 處理其他狀態 (例如 'unknown', 'unavailable' 或混合狀態)
    const currentState = trackerStates.join(', ');
    node.status({ fill: "grey", shape: "dot", text: `狀態待定: ${currentState}` });
}

return outputs;