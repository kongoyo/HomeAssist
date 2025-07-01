// Function Node: 廚房區域燈光控制邏輯 (加入 1 分鐘關燈防抖動)
// input: 來自 Join 節點的 msg.payload 物件，包含廚房感測器和油煙機開關狀態
// 5 outputs for function_node:
//   outputs[0]: 日常時段有人觸發 ( 09:00 ~ 01:59 )
//   outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 08:59 )
//   outputs[2]: 用餐時段 : 判斷油煙機S1是否開啟
//   outputs[3]: 任意時段有人超過 1 分鐘觸發
//   outputs[4]: 無人時段 : 關燈 (延遲 1 分鐘)

const now = new Date();
const currentHour = now.getHours();
// const currentMinute = now.getMinutes(); // 目前未在此邏輯中使用，但保留以備將來擴展

// 從 flow context 中獲取之前保存的關燈計時器 ID
let kitchenOffTimer = flow.get('kitchenOffTimer') || null;

// 判斷是否為「長時間存在」的觸發，通常來自於追蹤停留時間的獨立節點
const isProlongedPresence = msg.topic === "long_presence_trigger";

// 初始化所有輸出埠為 null
const outputs = [null, null, null, null, null];

// 安全地取得感測器狀態，避免因 payload 結構不完整而報錯
const kitchen_es3_state = msg.payload['sensor.linp_cn_blt_3_1k2qjerr0k400_es2_occupancy_status_p_2_1078'];
const kitchen_s1_state = msg.payload['switch.xiaomi_cn_751595190_ympqs1_on_p_2_1'];

// 檢查必要的感測器數據是否存在且有效
if (!kitchen_es3_state || !kitchen_s1_state) {
    node.status({ fill: "orange", shape: "dot", text: "感測器狀態遺失或無效，請檢查輸入" });
    // 清除計時器以防萬一
    if (kitchenOffTimer) {
        clearTimeout(kitchenOffTimer);
        flow.set('kitchenOffTimer', null);
    }
    return null; // 若無效數據則停止執行
}

// --- 主要邏輯判斷 ---
// 根據廚房人體感測器 (FP2) 的狀態進行判斷
if (kitchen_es3_state.startsWith('Has One')) { // 廚房ES3感測器顯示「有人」

    // 偵測到「有人」狀態時，無論如何都要先取消任何正在等待的關燈計時器
    if (kitchenOffTimer) {
        clearTimeout(kitchenOffTimer);
        flow.set('kitchenOffTimer', null); // 清除已取消的計時器 ID
    }

    // 情境 2: 用餐時段 - 判斷油煙機S1是否開啟
    if (kitchen_s1_state === 'on') {
        outputs[2] = { payload: "turn_on_dining_lights", topic: msg.topic };
        node.status({ fill: "yellow", shape: "dot", text: "用餐時段: 油煙機開啟中 (任意時段)" });
    } else {
        // 油煙機S1未開啟，根據時間和長時間存在判斷
        if (isProlongedPresence) {
            // 情境 3: 任意時段有人超過 10 秒鐘觸發
            outputs[3] = { payload: 'turn_on_prolonged_presence_lights', topic: msg.topic };
            node.status({ fill: "green", shape: "dot", text: "任意時段有人超過 10 秒鐘" });
        } else {
            // 非長時間存在，根據時間判斷
            // 日常時段 (09:00 ~ 01:59)
            if ((currentHour >= 9 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
                // outputs[0]: 日常時段有人觸發
                outputs[0] = { payload: "on_normal_daytime", topic: msg.topic };
                node.status({ fill: "green", shape: "dot", text: "日常時段有人 (09:00-01:59)" });
            }
            // 夜間/清晨時段 (02:00 ~ 08:59)
            else if (currentHour >= 2 && currentHour < 9) {
                // outputs[1]: 夜間/清晨時段有人觸發
                outputs[1] = { payload: "on_dim_nighttime", topic: msg.topic };
                node.status({ fill: "blue", shape: "dot", text: "夜間/清晨有人 (02:00-08:59)" });
            } else {
                // 應覆蓋所有時段，但作為備用
                node.status({ fill: "grey", shape: "dot", text: "廚房未定義時段有人 (無燈光輸出)" });
            }
        }
    }
    return outputs; // 有人時，立即返回燈光開啟指令

} else if (kitchen_es3_state === 'No One') { // 廚房ES3感測器顯示「無人」
    // 如果已經有計時器在跑，則不重複啟動，繼續等待現有的計時器。
    if (kitchenOffTimer) {
        node.status({ fill: "red", shape: "dot", text: "廚房無人 - 計時器已在運行" });
        return null; // 不發送任何新訊息
    }

    node.status({ fill: "red", shape: "dot", text: "廚房無人 - 1分鐘後嘗試關燈" });
    
    // 設定一個新的關燈計時器 (1 分鐘延遲)
    kitchenOffTimer = setTimeout(() => {
        // 在計時器回呼函式中發送關燈指令到 outputs[4]
        const offOutputs = [null, null, null, null, null];
        offOutputs[4] = { payload: "turn_off_lights", topic: msg.topic }; 
        node.send(offOutputs); // 延遲後發送關燈信號

        // 計時器執行完畢後，清除 flow context 中的計時器 ID
        flow.set('kitchenOffTimer', null);
        node.status({ fill: "red", shape: "dot", text: "廚房區域無人 - 已關燈" });
    }, 60000); // 60000 毫秒 = 1 分鐘

    // 將計時器 ID 存入 flow context，以便後續的「有人」訊息可以取消它
    flow.set('kitchenOffTimer', kitchenOffTimer);

    // 在計時器啟動時，不立即發送任何訊息，等待延遲結束
    return null; 

} else {
    // 未知狀態
    node.status({ fill: "orange", shape: "dot", text: "廚房感測器未知狀態: " + kitchen_es3_state });
    // 清除計時器以防萬一
    if (kitchenOffTimer) {
        clearTimeout(kitchenOffTimer);
        flow.set('kitchenOffTimer', null);
    }
    return null; // 不發送任何訊息
}