// Function Node: 浴室區域燈光時間判斷與控制
// msg.payload 來自感應器狀態 ('Has One' 或 'No One')
// msg.topic 可以用來區分是即時有人/無人，還是持續有人/無人
//           例如 'sensor.linp_cn_blt_3_1k2pm3jc8ck00_es2_occupancy_status_p_2_1078_for_1_minutes'）
//
// 浴室燈光時段及需求
// 
// 1. 日常 : 08:30~01:59 (跨日) => outputs[0] => 開啟浴室鏡櫃燈帶 (50%、3500) 延遲0.5秒後開啟浴室天花燈帶 (50%、3500)	
// 2. 夜間/清晨 : 02:00~08:29 => outputs[1] => 開啟浴室鏡櫃燈帶 (30%、3500)
// 3. 日間持續有人超過1分鐘 => outputs[2] => 開啟浴室筒燈 (40%、3500)
// 4. 夜間/清晨持續有人超過1分鐘 => outputs[3] => 
// 5. 無人	=> outputs[4] => 關閉浴室多燈帶
// 6. 無人超過1分鐘 => outputs[5] => 關閉浴室多筒燈

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null, null, null, null]; // 預設六個輸出埠
// 判斷是否是「持續有人超過10秒」的觸發
// 根據您在上游節點設定的自訂 topic 來判斷
const isProlongedPresence = msg.topic === "long_presence_trigger";

if  (msg.payload.substring(0,7) === 'Has One') {
    // 判斷若是日常時段，節點顏色綠色填滿
    if  ((currentHour === 8 && currentMinute >= 30) || (currentHour >= 9 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        if (isProlongedPresence) {
            outputs[2] = { payload: 'turn_on_spotlight_40%_3000K', topic: msg.topic};
            node.status({ fill: "green", shape: "dot", text: "浴室區域有人超過1分鐘 (08:30-01:59)" });

        } else {
            outputs[0] = { payload: 'turn_on_lightbelt_50%_3000K', topic: msg.topic};
            node.status({ fill: "green", shape: "dot", text: "浴室區域有人 (08:30-01:59)" });            
        }
        // 判斷若是夜間/清晨時段，節點顏色藍色填滿
        } else if ((currentHour >= 2 && currentHour < 8) || (currentHour === 8 && currentMinute < 30)) {
        if (isProlongedPresence) {
            // outputs[3] = { payload: 'tur_on_nothing', topic: msg.topic};
            node.status({ fill: "blue", shape: "dot", text: "夜間/清晨浴室區域有人超過1分鐘 (02:00-08:29)" });            
        } else {
            outputs[1] = { payload: 'turn_on_lightbelt_30%_3000K', topic: msg.topic};
            node.status({ fill: "blue", shape: "dot", text: "夜間/清晨浴室區域有人 (02:00-08:29)" });            
        }
        }
    // 判斷若是無人，節點顏色紅色填滿
    } else if (msg.payload === 'No One') {
        if (isProlongedPresence) {
            outputs[5] = { payload: 'turn_off_all_spotlight', topic: msg.topic};
            node.status({ fill: "red", shape: "dot", text: "無人超過1分鐘" });            
        } else {
            outputs[4] = { payload: 'turn_off_all_lightbelt', topic: msg.topic};
            node.status({ fill: "red", shape: "dot", text: "無人" });            
        }
    } else {
        // 如果收到了其他非 'on' 或 'off' 的狀態，例如 sensor 無效或初始化狀態
        node.status({ fill: "orange", shape: "dot", text: "未知狀態: " + msg.payload });
    }

return outputs;