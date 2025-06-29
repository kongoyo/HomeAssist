// Function Node: 整合廚房區域燈光時間判斷與開關燈邏輯
// device 來自米家藍牙人體傳感器 es3
// msg.payload 來自感應器狀態 ('Has One' 或 'No One')

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
// 輸出1 - outputs[0] : 用餐時段 : 判斷油煙機S1是否開啟 
// 輸出2 - outputs[1] : 一般時段 : 09:00~01:59
// 輸出3 - outputs[2] : 夜間/清晨時段 : 02:00~08:59
// 輸出3 - outputs[2] : 無人時段 : 關燈

const outputs = [null, null, null, null]; // 預設四個輸出埠

const kitchen_es3_state = msg.payload['sensor.linp_cn_blt_3_1k2qjerr0k400_es2_occupancy_status_p_2_1078'];
const kitchen_s1_state = msg.payload['switch.xiaomi_cn_751595190_ympqs1_on_p_2_1'];

if (kitchen_es3_state.substring(0,7) === 'Has One') { // 廚房人體es3顯示有人
    if (kitchen_s1_state === 'on') { // 油煙機S1顯示開啟 
        outputs[0] = { payload: "on_cooking", topic: msg.topic }; 
        node.status({ fill: "Yellow", shape: "dot", text: "廚房油煙機開啟中 (Anytime)" }); // 開啟廚房燈帶 開啟廚房筒燈 1 2 3 
    } else {
        if ((currentHour >= 9 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
            outputs[1] = { payload: "on_normal", topic: msg.topic };
            node.status({ fill: "green", shape: "dot", text: "廚房日常有人 (08:30-01:59)" }); // 開啟廚房燈帶 開啟廚房筒燈 2
        } else if (currentHour >= 2 && currentHour < 9) {
            outputs[2] = { payload: "on_dim", topic: msg.topic };
            node.status({ fill: "blue", shape: "dot", text: "廚房夜間/清晨有人 (02:00-08:29)" }); // 開啟廚房燈帶 開啟廚房筒燈 1
        } else {
            node.status({ fill: "grey", shape: "dot", text: "廚房未定義時段有人" });
        }
    }
} else if (kitchen_es3_state === 'No One') {
    outputs[3] = { payload: "off", topic: msg.topic }; 
    node.status({ fill: "red", shape: "dot", text: "廚房區域無人" }); // 關閉廚房燈帶筒燈
} else {
    node.status({ fill: "orange", shape: "dot", text: "未知狀態: " + msg.payload });
}

return outputs;