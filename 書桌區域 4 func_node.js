// Function Node: 整合書桌區域燈光時間判斷 (加入 10 秒關燈防抖動)
// 假設 msg.payload 是 sensor.linp_cn_blt_3_1ktpbrjdcck00_es2_occupancy_status_p_2_1078 的狀態 ('Has One' 或 'No One')

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
// outputs[0]: 日間有人
// outputs[1]: 夜間有人
// outputs[2]: 清晨有人
// outputs[3]: 無人關燈 (防抖動)
const outputs = [null, null, null, null]; 

// 從 flow context 中獲取之前保存的關燈計時器 ID
let deskOffTimer = flow.get('deskOffTimer') || null;

// --- 核心防抖動邏輯：處理計時器的啟動與取消 ---

// 檢查 msg.payload 是否為 'Has One' 的開頭
if (msg.payload.substring(0,7) === 'Has One') { 
    // 偵測到「有人」狀態時，無論如何都要先取消任何正在等待的關燈計時器
    if (deskOffTimer) {
        clearTimeout(deskOffTimer);
        flow.set('deskOffTimer', null); // 清除已取消的計時器 ID
        node.status({ fill: "green", shape: "dot", text: "書桌區域有人 - 取消關燈計時" });
    }

    // --- 有人狀態下的燈光判斷與輸出 ---
    // 判斷是否在夜間時段 (18:00 - 01:59)
    // 這裡使用 '||' 處理跨午夜的時間範圍
    if (currentHour >= 18 || currentHour < 2) {
        // 發送到輸出 2，用於夜間電視判斷並開啟客廳筒燈
        outputs[1] = msg;
        node.status({ fill: "yellow", shape: "dot", text: "書桌夜間有人 (18:00-01:59)" });
    }
    // 判斷是否在日間時段 (08:30 - 17:59)
    // 注意：這裡將 18:00 排除，避免與夜間時段重疊
    else if ((currentHour === 8 && currentMinute >= 30) || (currentHour >= 9 && currentHour < 18)) {
        // 發送到輸出 1，用於日間開啟書桌射燈和天花燈帶
        outputs[0] = msg;
        node.status({ fill: "green", shape: "dot", text: "書桌日間有人 (08:30-17:59)" });
    }
    // 判斷是否在清晨時段 (02:00 - 08:29)
    // 注意：這裡將 08:30 排除，避免與日間時段重疊
    else if (( currentHour >= 2 && currentHour < 8 ) || ( currentHour === 8 && currentMinute < 30 )) {
        // 發送到輸出 3，用於清晨光照度判斷
        outputs[2] = msg;
        node.status({ fill: "blue", shape: "dot", text: "書桌清晨有人 (02:00-08:29)" });
    }
    // 如果需要處理其他時段，例如凌晨 02:00 - 05:59，或是在此時段的預設行為
    else {
        // 發送到輸出 4，目前沒有明確定義，可以用於除錯或未來擴展
        outputs[3] = msg; // 假設這個時段也需要處理有人情況，但無特定開燈邏輯，或可以設定關燈
        node.status({ fill: "grey", shape: "dot", text: "書桌其他時段有人 (非主要時段)" });
    }
    return outputs; // 有人時，立即返回燈光開啟指令

// 當 msg.payload 為 'No One' 時，觸發關燈防抖動
} else if (msg.payload === 'No One') {
    // 如果已經有計時器在跑，則不重複啟動，繼續等待現有的計時器。
    if (deskOffTimer) {
        node.status({ fill: "red", shape: "dot", text: "書桌區域無人 - 計時器已在運行" });
        return [null, null, null, null]; // 不發送任何新訊息
    }

    node.status({ fill: "red", shape: "dot", text: "書桌區域無人 - 10 秒後嘗試關燈" });
    
    // 設定一個新的關燈計時器 (10 秒延遲)
    deskOffTimer = setTimeout(() => {
        // 在計時器回呼函式中發送關燈指令到 outputs[3]
        outputs[3] = { payload: "off", topic: "書桌無人" }; 
        node.send(outputs); // 延遲後發送關燈信號

        // 計時器執行完畢後，清除 flow context 中的計時器 ID
        flow.set('deskOffTimer', null);
        node.status({ fill: "red", shape: "dot", text: "書桌區域無人 - 已關閉燈光" });
    }, 10000); // 10000 毫秒 = 10 秒延遲

    // 將計時器 ID 存入 flow context，以便後續的「有人」訊息可以取消它
    flow.set('deskOffTimer', deskOffTimer);

    // 在計時器啟動時，不立即發送任何訊息，等待延遲結束
    return [null, null, null, null]; 

} else {
    // 如果收到了其他非 'Has One' 或 'No One' 的狀態，例如 sensor 無效或初始化狀態
    node.status({ fill: "orange", shape: "dot", text: "未知狀態: " + msg.payload });
    // 清除計時器以防萬一
    if (deskOffTimer) {
        clearTimeout(deskOffTimer);
        flow.set('deskOffTimer', null);
    }
    return null; // 不發送任何訊息
}