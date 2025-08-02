// Function Node: 回家模式控制邏輯
// input: XiaoMi M30 pro 智能門鎖
// Spec: (https://home.miot-spec.com/spec/xiaomi.lock.s20pro)
//    Door:
//    door-state
//      1 - Locked 已上锁
//      2 - Unlocked 已开锁
//      3 - Door Closed Properly After Left Ajar 解除门虚掩
//      4 - Door Was Ajar 门虚掩
//      5 - Leaving The Door Open Timed Out 门未关
//      17 - Locked 已上锁(童锁开，反锁关）
//      49 - Locked 已上锁(童锁开，反锁开)
//      33 - Locked 已上锁(童锁关，反锁开)
//      18 - Unlocked 已开锁(童锁开，反锁关）
//      50 - Unlocked 已开锁(童锁开，反锁开)
//      34 - Unlocked 已开锁(童锁关，反锁开)
//      19 - Door Closed Properly After Left Ajar 解除门虚掩(童锁开，反锁关)
//      51 - Door Closed Properly After Left Ajar 解除门虚掩(童锁开，反锁开)
//      35 - Door Closed Properly After Left Ajar 解除门虚掩(童锁关，反锁开)
//      20 - Door Was Ajar 门虚掩(童锁开，反锁关）
//      52 - Door Was Ajar 门虚掩(童锁开，反锁开)
//      36 - Door Was Ajar 门虚掩(童锁关，反锁开)
//      21 - Leaving The Door Open Timed Out 门未关(童锁开，反锁关）
//      53 - Leaving The Door Open Timed Out 门未关(童锁开，反锁开)
//      37 - Leaving The Door Open Timed Out 门未关(童锁关，反锁开)
//      6 - Door Not Close 门未关好
//      22 - Door Not Close 门未关好(童锁开，反锁关)
//      54 - Door Not Close 门未关好(童锁开，反锁开)
//      38 - Door Not Close 门未关好(童锁关，反锁开)
//    Lock:
//    Operation-method 
//      1 - Mobile Phone 手机
//      2 - Finger Print 指纹
//      3 - PassWord 密码
//      4 - NFC
//      5 - Lock Key 机械钥匙或应急旋钮
//      6 - One Time Password 一次性密码
//      7 - Periodic Password 周期性密码
//      8 - Coerce 胁迫
//      9 - Button Unlock Inside 门内按钮开锁
//      11 - Face 人脸
//      12 - Palm Print 掌纹
//      13 - Remote 远程开锁
//    Operation-position
//      1 - Indoor 门内
//      2 - OutDoor 门外
//    Lock-action
//      1 - Lock 自动上锁
//      2 - Unlock 开锁
//      3 - Locked From Inside 开启反锁
//      4 - Released Lock From Inside 关闭反锁
//      5 - Enabled Child Lock 开启童锁
//      6 - Disabled Child Lock 关闭童锁
//      7 - Enable The Away From Home Mode 开启离家模式
//      8 - Disable The Away From Home Mode 关闭离家模式
//      9 - Close The Door 关门
//
// Sample event
//	門內開鎖: Lock Event, attributes: {'Operation Method': 9, 'Operation Position': 1, 'Lock Action': 2}
//	關門: Lock Event, attributes: {'Operation Method': 0, 'Operation Position': 0, 'Lock Action': 9}
//	外部開鎖: Lock Event, attributes: {'Operation Position': 2, 'Lock Action': 2}
//	關門: Lock Event, attributes: {'Operation Method': 0, 'Operation Position': 0, 'Lock Action': 9}
//
// 3 outputs for function_node:
//   outputs[0]: 其中一人先回家 => 關閉離家模式(Lock-action 8)
//   outputs[1]: 兩人定位都不在家 => 開啟離家模式(Lock-action 7)

const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

const outputs = [null, null];

// outputs[1]: 兩人定位都不在家 => 開啟離家模式(Lock-action 7)
if (device_tracker.google_maps_107323348980544451599 === 'not_home' && device_tracker.google_maps_kongoyo_gmail_com === 'not_home') {
    outputs[1] = { payload: "on_outputs[1]", topic: msg.topic };
    node.status({ fill: "red", shape: "dot", text: "開啟離家模式" });
}
// outputs[0]: 其中一人先回家 => 關閉離家模式(Lock-action 8)
else if (device_tracker.google_maps_107323348980544451599 === 'home' || device_tracker.google_maps_kongoyo_gmail_com === 'home') {
    outputs[0] = { payload: "on_outputs[0]", topic: msg.topic };
    node.status({ fill: "green", shape: "dot", text: "關閉離家模式" });
}
else {
    node.status({ fill: "grey", shape: "dot", text: "發生異常情況" });
}