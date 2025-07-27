// Function Node: 整合主臥區域燈光時間判斷與開關燈邏輯
// msg.payload 來自感應器狀態 ('Has One' 或 'No One')

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null, null]; 

// if (msg.payload.substring(0, 7) === 'Has One') {
if (msg.payload.startsWith('Has One')) {
    // 判斷是否在日常時段 (09:00 - 01:59)
    // 這包含了跨午夜的情況： 09:00 至 23:59 或 00:00 至 01:59
    if ((currentHour > 9 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        // 發送到輸出 1，用於日常開啟主臥筒燈燈帶 (50% 亮度)
        outputs[0] = { payload: "on_normal", topic: msg.topic }; // 使用 payload "on_normal" 區分
        node.status({ fill: "green", shape: "dot", text: "主臥日常有人 (08:30-01:59)" });
    }
    // 判斷是否在夜間/清晨時段 (02:00 - 08:59)
    else if (currentHour >= 2 && currentHour < 9) {
        // 發送到輸出 2，用於夜間/清晨開啟主臥筒燈燈帶 (30% 亮度)
        outputs[1] = { payload: "on_dim", topic: msg.topic }; // 使用 payload "on_dim" 區分
        node.status({ fill: "yellow", shape: "dot", text: "主臥夜間/清晨有人 (02:00-08:29)" });
    }
    // 如果有其他時段，或者不符合上述條件，可以考慮預設動作或 debug
    else {
        // 如果有未定義的「有人」時段，可以發送一個預設的開燈信號，或者不動作
        // outputs[0] = { payload: "on_default", topic: msg.topic }; // 範例：預設開燈
        node.status({ fill: "grey", shape: "dot", text: "主臥未定義時段有人" });
    }
// } else if (msg.payload === 'No One') {
} else if (msg.payload.startsWith('No One')) {
    // 當主臥無人時，發送一個信號到輸出 3，觸發關燈邏輯
    if ((currentHour > 9 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        // 發送到輸出 2，用於日常關閉主臥筒燈燈帶
        outputs[2] = { payload: "off", topic: msg.topic }; // 使用 payload "off" 觸發關燈
        node.status({ fill: "red", shape: "dot", text: "主臥區域日常無人" });
    }
    // 判斷是否在夜間/清晨時段 (02:00 - 08:59)
    else if (currentHour >= 2 && currentHour < 9) {
        // 發送到輸出 3，用於夜間/清晨關閉主臥廁所筒燈
        outputs[3] = { payload: "off", topic: msg.topic }; // 使用 payload "off" 觸發關燈
        node.status({ fill: "red", shape: "dot", text: "主臥區域夜間/清晨無人" });
    }
    // 如果有其他時段，或者不符合上述條件，可以考慮預設動作或 debug
    else {
        // 如果有未定義的「有人」時段，可以發送一個預設的開燈信號，或者不動作
        // outputs[0] = { payload: "on_default", topic: msg.topic }; // 範例：預設開燈
        node.status({ fill: "grey", shape: "dot", text: "主臥未定義時段有人" });
    }
} else {
    // 如果收到了其他非 'Has One' 或 'No One' 的狀態，例如 sensor 無效或初始化狀態
    node.status({ fill: "orange", shape: "dot", text: "未知狀態: " + msg.payload });
}

return outputs;