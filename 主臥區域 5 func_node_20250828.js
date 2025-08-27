// Function Node: 整合主臥區域燈光時間判斷與開關燈邏輯
// msg.payload 來自感應器狀態 ('Has One' 或 'No One')

// 新增一個 output 用於「無人超過30分鐘」警告
const outputs = [null, null, null, null, null]; // 多一個 output

const lastNoOneTime = context.get('lastNoOneTime') || null;
const lastHasOneTime = context.get('lastHasOneTime') || null;
const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// if (msg.payload.substring(0, 7) === 'Has One') {
if (msg.payload.startsWith('Has One')) {
    // 有人時，記錄時間
    context.set('lastHasOneTime', now.getTime());
    // 清除無人計時器
    const timer = context.get('noOneTimer');
    if (timer) {
        clearTimeout(timer);
        context.set('noOneTimer', null);
    }
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
    // 狀態從有人變成無人時才記錄時間並啟動計時器
    if (!lastNoOneTime || (lastHasOneTime && lastHasOneTime > lastNoOneTime)) {
        context.set('lastNoOneTime', now.getTime());
        // 清除舊的計時器
        const timer = context.get('noOneTimer');
        if (timer) {
            clearTimeout(timer);
        }
        // 啟動新的30分鐘計時器
        const newTimer = setTimeout(() => {
            // 檢查狀態是否仍為No One
            const lastNoOneTimeCheck = context.get('lastNoOneTime');
            const lastHasOneTimeCheck = context.get('lastHasOneTime');
            if (lastNoOneTimeCheck && (!lastHasOneTimeCheck || lastNoOneTimeCheck > lastHasOneTimeCheck)) {
                node.send([null, null, null, null, { payload: "no_one_30min", topic: msg.topic }]);
                node.status({ fill: "blue", shape: "dot", text: "主臥無人超過30分鐘" });
            }
        }, 1800000); // 30分鐘
        context.set('noOneTimer', newTimer);
    }
    // 無人時，記錄時間
    context.set('lastNoOneTime', now.getTime());
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

// 判斷是否「無人」且已超過30分鐘
if (lastNoOneTime && (!lastHasOneTime || lastNoOneTime > lastHasOneTime)) {
    const diffMinutes = (now.getTime() - lastNoOneTime) / 1000 / 60;
    if (diffMinutes >= 1) {
        outputs[4] = { payload: "no_one_30min", topic: msg.topic };
        node.status({ fill: "blue", shape: "dot", text: "主臥無人超過30分鐘" });
    }
}

return outputs;