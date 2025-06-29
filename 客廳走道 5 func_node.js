// Function Node: 客廳走道燈光控制邏輯 (加入 10 秒關燈防抖動)
// input: Aqara FP2 人在感測器 ('on' or 'off')

// 4 outputs for function_node:
//   outputs[0]: 日常時段有人觸發 ( 16:00 ~ 01:59 )
//   outputs[1]: 夜間/清晨時段有人觸發 ( 02:00 ~ 15:59 )
//   outputs[2]: 持續有人觸發 ( 16:00 ~ 01:59 )
//   outputs[3]: 無人觸發 (延遲 10 秒防抖動)

const now = new Date();
const currentHour = now.getHours();

// Initialize outputs to null
const outputs = [null, null, null, null];

// Get existing timers from flow context
let prolongedPresenceTimer = flow.get('prolongedPresenceTimer') || null;
let noOneTimer = flow.get('noOneTimer') || null;

// Clear all timers initially to prevent unexpected behavior
if (prolongedPresenceTimer) {
    clearTimeout(prolongedPresenceTimer);
    flow.set('prolongedPresenceTimer', null);
}
if (noOneTimer) {
    clearTimeout(noOneTimer);
    flow.set('noOneTimer', null);
}

// --- Timer Cancellation Logic End ---

if (msg.payload === 'on') {
    // When presence is detected ('on'), immediately cancel the 'noOneTimer'
    // to prevent the lights from turning off if someone re-enters quickly.
    if (noOneTimer) {
        clearTimeout(noOneTimer);
        flow.set('noOneTimer', null);
        node.status({ fill: "green", shape: "dot", text: "有人進入, 取消無人計時" });
    }

    // Determine the immediate 'on' output based on time
    if ((currentHour >= 16 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        // Daily period: 16:00 ~ 01:59
        outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
        node.status({ fill: "green", shape: "dot", text: "日常有人 (16:00-01:59)" });
    } else if (currentHour >= 2 && currentHour < 16) {
        // Night/Early Morning period: 02:00 ~ 15:59
        outputs[1] = { payload: "on_outputs[1]", topic: msg.topic };
        node.status({ fill: "blue", shape: "dot", text: "夜間/清晨有人 (02:00-15:59)" });
    }

    // Set a timer for "prolonged presence" if within the daily period
    // This timer is only set if someone is 'on' during the specific hours.
    if ((currentHour >= 12 && currentHour <= 23) || (currentHour >= 0 && currentHour < 2)) {
        prolongedPresenceTimer = setTimeout(function () {
            // Re-check the time when the timer fires, as the hour might have just changed
            const hourAtFire = new Date().getHours();
            if ((hourAtFire >= 12 && hourAtFire <= 23) || (hourAtFire >= 0 && hourAtFire < 2)) {
                outputs[2] = { payload: "on_outputs[2]", topic: msg.topic };
                node.send([null, null, outputs[2], null]); // Send only output[2]
                node.status({ fill: "yellow", shape: "dot", text: "持續10秒有人 (12:00-01:59)" });
            }
            flow.set('prolongedPresenceTimer', null); // Clear timer ID after it fires
        }, 10000); // 10 seconds
        flow.set('prolongedPresenceTimer', prolongedPresenceTimer); // Store timer ID
    }
    return outputs; // Send the immediate 'on' output(s)
} else if (msg.payload === 'off') {
    // outputs[3]: 無人觸發 (延遲 10 秒防抖動)
    if (prolongedPresenceTimer) {
        clearTimeout(prolongedPresenceTimer);
        flow.set('prolongedPresenceTimer', null);
        node.status({ fill: "red", shape: "dot", text: "無人, 取消持續有人計時" });
    }
    if (!noOneTimer) { // Only set if no timer is already running
        noOneTimer = setTimeout(function () {
            outputs[3] = { payload: "on_outputs[3]", topic: msg.topic };
            node.send([null, null, null, outputs[3]]); // Send only output[3]
            node.status({ fill: "red", shape: "dot", text: "客廳走道無人 - 已關燈" });
            flow.set('noOneTimer', null); // Clear timer ID after it fires
        }, 10000); // 10 seconds
        flow.set('noOneTimer', noOneTimer); // Store timer ID
        node.status({ fill: "orange", shape: "dot", text: "無人觸發, 10秒後關燈" });
    }
    // Do not return outputs here immediately for 'off' to avoid premature actions.
    // The outputs[3] will be sent when the noOneTimer fires.
    return null; 
} else {
    // Handle unexpected payload values
    node.status({ fill: "orange", shape: "dot", text: `未知狀態: ${msg.payload}` });
    // Clear all timers for safety
    if (prolongedPresenceTimer) {
        clearTimeout(prolongedPresenceTimer);
        flow.set('prolongedPresenceTimer', null);
    }
    if (noOneTimer) {
        clearTimeout(noOneTimer);
        flow.set('noOneTimer', null);
    }
    return null; // Do not send any message for unknown states
}