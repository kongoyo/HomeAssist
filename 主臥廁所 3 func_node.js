// Function Node: 主臥廁所燈光控制邏輯 (加入 60 秒關燈防抖動)
// input: Aqara 高精度 ('on' or 'off')
// 3 outputs for function_node:
//   outputs[0]: 日常時段有人觸發 ( 08:30 ~ 01:59)
//   outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 08:29 )
//   outputs[2]: 無人觸發 (延遲 20 秒防抖動)

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出訊息的陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null];

// 清除 bathroomOffTimer 
let bathroomOffTimer = flow.get('bathroomOffTimer') || null;

// --- 核心防抖動邏輯：處理計時器的啟動與取消 ---

if (msg.payload === 'on') {
    // 偵測到「有人」狀態時，無論如何都要先取消任何正在等待的關燈計時器
    if (bathroomOffTimer) {
        clearTimeout(bathroomOffTimer);
        flow.set('bathroomOffTimer', null); // 清除已取消的計時器 ID
        node.status({ fill: "green", shape: "dot", text: "有人 - 取消關燈計時" });
        // console.log("關燈計時器已取消 (有人)"); // 除錯用
    }

    // --- 有人狀態下的燈光開啟邏輯 ---
    // outputs[0]: 日常時段有人觸發 ( 08:30 ~ 01:59)
    if ((currentHour === 8 && currentMinute >= 30) || (currentHour > 8 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
        node.status({ fill: "green", shape: "dot", text: "日常有人 (08:30-01:59)" });
    } else { 
        // outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 08:29 )
        outputs[1] = { payload: "on_outputs[1]", topic: msg.topic };
        node.status({ fill: "blue", shape: "dot", text: "夜間/清晨有人 (02:00-08:29)" });
    }
    return outputs; // 有人時，立即返回燈光開啟指令
} else if (msg.payload === 'off') {
    // 偵測到「無人」狀態時，啟動關燈防抖動計時器
    // 如果已經有計時器在跑，則不重複啟動，繼續等待現有的計時器。
    if (bathroomOffTimer) {
        node.status({ fill: "red", shape: "dot", text: "無人 - 計時器已在運行" });
        return [null, null, null]; // 不發送任何新訊息
    }
    node.status({ fill: "red", shape: "dot", text: "主臥廁所無人 - 20秒後嘗試關燈" });
    // console.log("無人 - 啟動關燈計時器"); // 除錯用
    // 設定一個新的關燈計時器 (60 秒延遲)
    bathroomOffTimer = setTimeout(() => {
        outputs[2] = { payload: "on_outputs[3]", topic: msg.topic };
        node.send(outputs);
        // 計時器執行完畢後，清除 flow context 中的計時器 ID
        flow.set('bathroomOffTimer', null);
        node.status({ fill: "red", shape: "dot", text: "主臥廁所無人 - 已關燈" });
        // console.log("關燈計時器結束 - 已關燈"); // 除錯用
    }, 20000); // 20000 毫秒 = 20 秒延遲
    // 將計時器 ID 存入 flow context，以便其他訊息可以取消它
    flow.set('bathroomOffTimer', bathroomOffTimer);

    // 在計時器啟動時，不立即發送任何訊息，等待延遲結束
    return [null, null, null];
} else {
    // 如果收到了其他非 'on' 或 'off' 的狀態，例如 sensor 無效或初始化狀態
    node.status({ fill: "orange", shape: "dot", text: `未知狀態: ${msg.payload}` });
    // 清除計時器以防萬一
    if (bathroomOffTimer) {
        clearTimeout(bathroomOffTimer);
        flow.set('bathroomOffTimer', null);
    }
    return null; // 不發送任何訊息
}