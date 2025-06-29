// Function Node: 整合書桌區域燈光時間判斷
// 假設 msg.payload 是 sensor.linp_cn_blt_3_1ktpbrjdcck00_es2_occupancy_status_p_2_1078 的狀態 ('Has One' 或其他)

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null, null]; // 預設四個輸出埠

// 只有當書桌區域有人 ('Has One') 時才進行燈光判斷
if (msg.payload.substring(0,7) === 'Has One') { 
    // 判斷是否在夜間時段 (18:00 - 01:59)
    // 這裡使用 '||' 處理跨午夜的時間範圍
    if (currentHour >= 18 || currentHour < 2) {
        // 發送到輸出 2，用於夜間電視判斷並開啟客廳筒燈
        outputs[1] = msg;
        node.status({ fill: "blue", shape: "dot", text: "書桌夜間有人 (18:00-01:59)" });
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
        node.status({ fill: "yellow", shape: "dot", text: "書桌清晨有人 (02:00-08:29)" });
    }
    // 如果需要處理其他時段，例如凌晨 02:00 - 05:59，或是在此時段的預設行為
    else {
        // 發送到輸出 4，目前沒有明確定義，可以用於除錯或未來擴展
        outputs[3] = msg; // 假設這個時段也需要處理有人情況，但無特定開燈邏輯，或可以設定關燈
        node.status({ fill: "grey", shape: "dot", text: "書桌其他時段有人" });
    }
} else {
    // 當無人時，發送一個信號到輸出 4，用於觸發關燈邏輯
    node.status({ fill: "red", shape: "dot", text: "書桌區域無人" });
    outputs[3] = { payload: "off", topic: "書桌無人" }; // 發送關燈信號
}

return outputs;