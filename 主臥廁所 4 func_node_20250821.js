// Function Node: 主臥廁所燈光控制邏輯
// input: 米家人體es3
// 3 outputs for function_node:
//   outputs[0]: 有人觸發
//   outputs[1]: 無人觸發 (延遲 5 秒防抖動)
//   outputs[2]: 持續有人超過 10 秒觸發

// 輸出訊息的陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
// 根據新的需求，我們只需要 3 個輸出。
const outputs = [null, null, null];

// 從 flow context 獲取計時器 ID，以便在節點重啟或重新部署時能正確處理
let bathroomOffTimer = flow.get('bathroomOffTimer') || null;
let bathroomOnTimer = flow.get('bathroomOnTimer') || null;
let bathroomOnTimerActive = flow.get('bathroomOnTimerActive') || false;

// --- 核心防抖動邏輯：處理計時器的啟動與取消 ---

if (msg.payload != 'No One') {
    // 偵測到「有人」狀態時，無論如何都要先取消任何正在等待的關燈計時器
    if (bathroomOffTimer) {
        clearTimeout(bathroomOffTimer);
        flow.set('bathroomOffTimer', null); // 清除已取消的計時器 ID
        node.status({ fill: "green", shape: "dot", text: "有人 - 取消關燈計時" });
        // console.log("關燈計時器已取消 (有人)"); // 除錯用
    }

    // --- 持續有人超過 10 秒才觸發 outputs[2] ---
    if (!bathroomOnTimerActive) {
        // 尚未啟動 timer，開始計時
        bathroomOnTimer = setTimeout(() => {
            // 為了避免發送舊的或不相關的訊息，我們在這裡創建一個新的訊息陣列
            const timeoutOutputs = [null, null, { payload: "on_outputs[2]", topic: msg.topic }];
            node.send(timeoutOutputs);
            flow.set('bathroomOnTimerActive', false);
            flow.set('bathroomOnTimer', null);
            node.status({ fill: "purple", shape: "dot", text: "持續有人超過 10 秒" });
        }, 10000); // 10000 毫秒 = 10 秒
        flow.set('bathroomOnTimer', bathroomOnTimer);
        flow.set('bathroomOnTimerActive', true);
        // 狀態更新：顯示有人，並在計時中
        node.status({ fill: "green", shape: "ring", text: "有人 - 計時中 (10秒)" });
    }

    // outputs[0]: 只要有人就觸發
    outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
    // 狀態更新：如果計時器已在運行，保持環形狀態，否則顯示綠色點
    if (!bathroomOnTimerActive) node.status({ fill: "green", shape: "dot", text: "有人" });

    return outputs;
} else if (msg.payload.startsWith('No One')) {
    // 偵測到「無人」狀態時，啟動關燈防抖動計時器
    if (bathroomOffTimer) {
        node.status({ fill: "red", shape: "dot", text: "無人 - 計時器已在運行" });
        return null; // 不發送任何訊息
    }
    node.status({ fill: "red", shape: "dot", text: "主臥廁所無人 - 5秒後嘗試關燈" });
    bathroomOffTimer = setTimeout(() => {
        // 為了避免發送舊的或不相關的訊息，我們在這裡創建一個新的訊息陣列
        const timeoutOutputs = [null, { payload: "on_outputs[1]", topic: msg.topic }, null];
        node.send(timeoutOutputs);
        flow.set('bathroomOffTimer', null);
        node.status({ fill: "red", shape: "dot", text: "主臥廁所無人 - 已關燈" });
    }, 5000);
    flow.set('bathroomOffTimer', bathroomOffTimer);

    // --- 當偵測到無人時，取消「持續有人」的計時器 ---
    if (bathroomOnTimer) {
        clearTimeout(bathroomOnTimer);
        flow.set('bathroomOnTimer', null);
        flow.set('bathroomOnTimerActive', false);
        node.status({ fill: "grey", shape: "ring", text: "無人 - 取消有人計時" });
    }

    return null; // 不立即發送任何訊息
} else {
    node.status({ fill: "orange", shape: "dot", text: `未知狀態: ${msg.payload}` });
    if (bathroomOffTimer) {
        clearTimeout(bathroomOffTimer);
        flow.set('bathroomOffTimer', null);
    }
    // 未知狀態也取消「持續有人」的計時器
    if (bathroomOnTimer) {
        clearTimeout(bathroomOnTimer);
        flow.set('bathroomOnTimer', null);
        flow.set('bathroomOnTimerActive', false);
    }
    return null;
}