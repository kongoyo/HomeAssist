// Function Node: 客廳沙發燈光控制邏輯 (加入 30 秒關燈防抖動)
// input: Aqara FP2 人在感測器 ('on' or 'off')
// 4 outputs for function_node:
//   outputs[0]: 日常時段有人觸發 ( 08:00 ~ 01:59 )
//   outputs[1]: 夜間清晨時段有人觸發 ( 02:00 ~ 07:59 )
//   outputs[2]: 日常時段持續有人觸發 ( 08:00 ~ 01:59 )
//   outputs[3]: 無人觸發 (延遲 30 秒防抖動)
const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();
const outputs = [null, null, null, null];
// 上游節點傳入持續有人訊號
const isProlongedPresence = msg.topic === "long_presence_trigger";
// 設定防抖動計時器
let NoOneTimer = flow.get('NoOneTimer') || null;
// --- 處理計時器取消邏輯 ---
if (NoOneTimer) {
    clearTimeout(NoOneTimer);
    flow.set('NoOneTimer', null); 
}
// --- 計時器取消邏輯結束 ---
if (msg.payload.startsWith("Has One")) {
    // ---- 有人狀態下的燈光邏輯區塊 ----
    if ((currentHour >= 8 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        if (isProlongedPresence) {
            // 日常時段持續有人觸發 ( 08:00 ~ 01:59 )
            outputs[2] = { payload: 'on_outputs[2]', topic: msg.topic };
            node.status({ fill: "yellow", shape: "dot", text: "日常時段持續有人觸發 ( 08:00 ~ 01:59 )" });
        } else {
            // 日常時段有人觸發 ( 08:00 ~ 01:59 )
            outputs[0] = { payload: 'on_outputs[0]', brightness_pct: 50, color_temp_kelvin: 3500, topic: msg.topic };
            node.status({ fill: "green", shape: "dot", text: "日常時段有人觸發 ( 08:00 ~ 01:59 )" });
        }
    }
    else if ((currentHour >= 2 && currentHour < 8)) {
        // 夜間清晨時段有人觸發 ( 02:00 ~ 07:59 )
        outputs[1] = { payload: 'on_outputs[1]', topic: msg.topic };
        node.status({ fill: "blue", shape: "dot", text: "夜間/清晨浴室區域有人 (02:00-07:59)" });
    }
    else {
        node.status({ fill: "grey", shape: "dot", text: "其他未定義時段有人" });
    }
    return outputs;
    // ---- 有人狀態下的燈光邏輯區塊 ----
} else if (msg.payload === 'No One') {
    // ---- 無人狀態下的燈光邏輯區塊 ----
        node.status({ fill: "red", shape: "dot", text: "浴室無人 - 30 秒後嘗試關燈" });
        NoOneTimer = setTimeout(function () {
            outputs[3] = { payload: 'on_outputs[3]', topic: msg.topic }; 
            node.send(outputs);
            flow.set('NoOneTimer', null);
            node.status({ fill: "red", shape: "dot", text: "浴室無人 - 已關燈" });
        }, 30000);

        flow.set('NoOneTimer', NoOneTimer);
        return [null, null, null, null];
    // ---- 無人狀態下的燈光邏輯區塊 ----
} else {
    node.status({ fill: "orange", shape: "dot", text: "未知狀態: " + msg.payload });
    flow.set('NoOneTimer', null);
    return null;
}