// Function Node: 整合客廳燈光時間判斷
// 假設 msg.payload 是 binary_sensor.presence_sensor_fp2_c63f_presence_sensor_5 的狀態 ('on' 或 'off')

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null, null]; // 預設四個輸出埠

// 從 flow context 中獲取之前保存的計時器 ID
let sofaNoOneTimer = flow.get('sofaNoOneTimer') || null;

// 清除之前設定的計時器（如果存在）
// 這是關鍵，當狀態改變時，無論是從無人變有人，還是從有人變無人，
// 都需要先取消前一個「無人」計時器，以避免重複或錯誤的關燈動作。
if (sofaNoOneTimer) {
    clearTimeout(sofaNoOneTimer);
    flow.set('sofaNoOneTimer', null); // 清除已取消的計時器ID
    // node.warn("Cleared existing sofaNoOneTimer"); // 可以用來除錯
}

// 只有當客廳沙發FP2有人 ('on') 時才進行燈光判斷
if (msg.payload === 'on') {
    // 判斷是否在夜間時段 (18:00 - 01:59)
    // 這裡使用 '||' 處理跨午夜的時間範圍
    if (currentHour >= 18 || currentHour < 2) {
        // 發送到輸出 2，用於檢查電視機狀態
        outputs[1] = msg;
        node.status({ fill: "blue", shape: "dot", text: "夜間有人 (18:00-01:59)" });
    }
    // 判斷是否在日間時段 (08:30 - 17:59)
    // 注意：這裡將 18:00 排除，避免與夜間時段重疊
    else if ((currentHour === 8 && currentMinute >= 30) || (currentHour > 8 && currentHour < 18)) {
        // 發送到輸出 1，用於日間開燈 (亮度20%)
        outputs[0] = msg;
        node.status({ fill: "green", shape: "dot", text: "日間有人 (08:30-17:59)" });
    }
    // 判斷是否在清晨時段 (06:30 - 08:29)
    // 注意：這裡將 08:30 排除，避免與日間時段重疊
    else if ((currentHour >= 2 && currentHour < 8) || (currentHour === 8 && currentMinute < 30)) {
        // 發送到輸出 3，用於清晨光照度判斷 (亮度10%)
        outputs[2] = msg;
        node.status({ fill: "yellow", shape: "dot", text: "清晨有人 (02:00-08:29)" });
    }
    // 如果需要處理其他時段，例如凌晨 02:00 - 06:29
    else {
        // 發送到輸出 4，或其他自定義邏輯
        // 例如：outputs[3] = msg; // 如果這個時段需要特殊處理
        node.status({ fill: "grey", shape: "dot", text: "其他時段有人" });
    }
} else {
    // 當無人時，清除狀態，或者可以在這裡處理關燈邏輯
    node.status({ fill: "red", shape: "dot", text: "客廳沙發無人" });
    // 如果您希望在無人時觸發關燈邏輯，可以在這裡發送一個訊息到特定的輸出埠
    setTimeout(function () {
        outputs[3] = { payload: "off" }; // 假設輸出4用於關燈信號
    }, 10000);
}

return outputs;