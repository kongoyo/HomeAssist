// Function Node: 客廳走道燈光時間判斷與控制
// msg.payload 來自感應器狀態 ('on' 或 'off')
// msg.topic 可以用來區分是即時有人/無人，還是持續有人/無人（例如 'binary_sensor.presence_sensor_fp2_c63f_presence_sensor_6_for_10_seconds'）

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null, null, null]; // 預設五個輸出埠

// 判斷是否是「持續有人超過10秒」的觸發
// 根據您在上游節點設定的自訂 topic 來判斷
const isProlongedPresence = msg.topic === "long_presence_trigger";

if (msg.payload === 'on') {
    // 判斷是否是「持續有人超過10秒」觸發的情境 3
    if (isProlongedPresence) {
        // 情境 3: 16:00 - 01:59 內，客廳走道有人超過10秒開多盞燈 (鞋櫃筒燈 & T型燈帶)
        // 以及根據原流程，同時關閉客廳筒燈
        if (currentHour >= 16 || currentHour < 2) {
            outputs[2] = { payload: "turn_on_prolonged", topic: msg.topic }; // 觸發開鞋櫃筒燈和T型燈帶
            outputs[3] = { payload: "turn_off_some_spotlights", topic: msg.topic }; // 觸發關客廳筒燈
            node.status({ fill: "blue", shape: "dot", text: "客廳走道有人超過10秒 (16:00-01:59)" });
        } else {
            // 如果超過10秒但不在特定時段，可以選擇什麼都不做或執行預設開燈
            node.status({ fill: "grey", shape: "dot", text: "客廳走道長時間有人,但不在特定時段" });
        }
    } else {
        // 判斷是否是「即時有人」觸發的情境 1 或 2
        // 情境 1: 02:00 - 08:29 (即到 08:30 前) 內，客廳走道有人開單筒燈 (亮度 20%)
        if ((currentHour >= 2 && currentHour < 8) || (currentHour === 8 && currentMinute < 30)) {
            outputs[1] = { payload: "turn_on_single_spotlight_dim", topic: msg.topic };
            node.status({ fill: "yellow", shape: "dot", text: "客廳走道有人 (02:00-08:29)" });
        }
        // 情境 2: 08:30 - 01:59 (即到 02:00 前) 內，客廳走道有人開多筒燈 (亮度 30%)
        else { // 如果不在情境1的時段內，就假設是情境2的時段
            outputs[0] = { payload: "turn_on_multi_spotlights_normal", topic: msg.topic };
            node.status({ fill: "green", shape: "dot", text: "客廳走道有人 (08:30-01:59)" });
        }
    }
} else if (msg.payload === 'off') {
    // 情境 4: 全時段無人關燈
    outputs[4] = { payload: "turn_off_all", topic: msg.topic };
    node.status({ fill: "red", shape: "dot", text: "客廳走道無人" });
} else {
    // 如果收到了其他非 'on' 或 'off' 的狀態，例如 sensor 無效或初始化狀態
    node.status({ fill: "orange", shape: "dot", text: "未知狀態: " + msg.payload });
}

return outputs;