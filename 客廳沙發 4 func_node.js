// Function Node: 客廳沙發燈光控制邏輯 (加入 30 秒關燈防抖動)
// input: Aqara FP2 人在感測器 ('on' or 'off')
// 4 outputs for function_node:
//   outputs[0]: 電視機未開啟，日常時段有人觸發 ( 08:30 ~ 01:59 )
//   outputs[1]: 電視機未開啟，夜間/清晨時段有人觸發 ( 02:00 ~ 08:29 )
//   outputs[2]: 電視機已開啟，傍晚到清晨時段有人觸發 ( 17:00 ~ 07:59 )
//   outputs[3]: 無人觸發 (延遲 30 秒防抖動)

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// 輸出訊息的陣列，每個元素對應一個輸出埠。null 表示不發送訊息。
const outputs = [null, null, null, null];

// 清除 sofaNoOneTimer
let sofaNoOneTimer = flow.get("sofaNoOneTimer") || null;

// --- 獲取感測器和電視機狀態 ---
// 使用join node。
// 設定 :
//   模式 : 手動
//   合併每個 : msg.payload
//   輸出為 : object value pair
//   使用 msg.data.entity_id 為鍵
//   達到一定數量的資訊時 : 2

const sofaSensorState =
  msg.payload["binary_sensor.presence_sensor_fp2_c63f_presence_sensor_5"];
const tvState = msg.payload["remote.samsung_q70aa_65_tv"];

// --- 處理計時器取消邏輯 ---
// 每次收到訊息，先取消之前設定的「無人」計時器(如果存在)
if (sofaNoOneTimer) {
  clearTimeout(sofaNoOneTimer);
  flow.set("sofaNoOneTimer", null); // 清除已取消的計時器ID
  // node.warn("Cleared existing sofaNoOneTimer"); // 除錯用，可視需要啟用
}
// --- 計時器取消邏輯結束 ---

// 只有當客廳沙發 FP2 有人 ('on') 時才進行燈光判斷
if (sofaSensorState === "on") {
  // outputs[2]: 電視機已開啟，傍晚到清晨時段有人觸發 ( 17:00 ~ 07:59 )
  if (tvState === "on" && (currentHour >= 17 || currentHour < 8)) {
    outputs[2] = { payload: "on_outputs[2]", topic: msg.topic };
    node.status({
      fill: "yellow",
      shape: "dot",
      text: "電視開啟模式 (17:00-07:59)",
    });
  }
  // 電視機未開啟時的燈光判斷
  else {
    // outputs[0]: 電視機未開啟，日常時段有人觸發 ( 08:30 ~ 01:59 )
    if (
      (currentHour === 8 && currentMinute >= 30) ||
      (currentHour > 8 && currentHour <= 23) ||
      (currentHour >= 0 && currentHour < 2)
    ) {
      outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
      node.status({
        fill: "green",
        shape: "dot",
        text: "日常有人 (08:30-01:59)",
      });
    }
    // outputs[1]: 電視機未開啟，夜間/清晨時段有人觸發 ( 02:00 ~ 08:29 )
    else if (
      (currentHour >= 2 && currentHour < 8) ||
      (currentHour === 8 && currentMinute < 30)
    ) {
      outputs[1] = { payload: "on_outputs[1]", topic: msg.topic };
      node.status({
        fill: "blue",
        shape: "dot",
        text: "夜間/清晨有人 (02:00-08:29)",
      });
    }
    // 未定義的有人時段（理論上上述已覆蓋所有有人時段）
    else {
      node.status({ fill: "grey", shape: "dot", text: "其他未定義時段有人" });
    }
  }
  // 立即返回 outputs，因為有人時需要即時反應
  return outputs;
} else if (sofaSensorState === "off") {
  // 偵測到「無人」狀態時，啟動關燈防抖動計時器
  // 如果已經有計時器在跑，則不重複啟動，繼續等待現有的計時器。
  node.status({
    fill: "red",
    shape: "dot",
    text: "客廳沙發無人 - 30 秒後嘗試關燈",
  });
  // outputs[3]: 無人觸發 (延遲 30 秒防抖動)
  sofaNoOneTimer = setTimeout(function () {
    outputs[3] = { payload: "on_outputs[3]", topic: msg.topic };
    node.send(outputs);
    // 計時器執行完畢後，清除 flow context 中的計時器 ID
    flow.set("sofaNoOneTimer", null);
    node.status({ fill: "red", shape: "dot", text: "客廳沙發無人 - 已關燈" });
  }, 30000); // 30000 毫秒 = 30 秒延遲
  flow.set("sofaNoOneTimer", sofaNoOneTimer); // 將計時器ID存入 flow context
  // 這裡不立即返回 outputs，因為關燈信號在延遲後才發送
  return [null, null, null, null]; // 延遲發送，所以此處不返回任何訊息
} else {
  // 如果收到了未知狀態，例如 Join 節點未完成，或者感測器狀態不是 'on'/'off'
  node.status({
    fill: "orange",
    shape: "dot",
    text: `未知狀態: ${msg.payload}`,
  });
  // 清除計時器以防萬一
  flow.set("sofaNoOneTimer", null);
  return null; // 不發送任何訊息
}
