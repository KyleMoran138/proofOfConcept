"use strict";
let flow = {
    get: () => { return {}; },
    set: () => { },
};
let node = {
    send: (...anything) => { console.log('node send', anything); }
};
let msg = {
    event: 'dimmer01-on',
};
var Warmth;
(function (Warmth) {
    Warmth[Warmth["ICY"] = 150] = "ICY";
    Warmth[Warmth["COOL"] = 250] = "COOL";
    Warmth[Warmth["NEUTRAL"] = 300] = "NEUTRAL";
    Warmth[Warmth["SUNNY"] = 370] = "SUNNY";
    Warmth[Warmth["CANDLE"] = 500] = "CANDLE";
})(Warmth || (Warmth = {}));
class State {
    constructor(previousData, msg) {
        this.getTrueStateMaps = () => {
            let returnVal = [];
            if (!this.data.stateMap)
                return returnVal;
            for (const [stateMapCheck, stateMapValue] of this.data.stateMap) {
                const [stateMapTrue, priority] = stateMapCheck(this.data);
                if (stateMapTrue) {
                    returnVal.push([stateMapValue, priority || 0]);
                }
            }
            return returnVal;
        };
        this.mergeStateMaps = () => {
            let returnVal = new Map();
            let eventPriority = new Map();
            const trueStateMaps = this.getTrueStateMaps();
            for (const [stateMapToCombine, stateMapPriority] of trueStateMaps) {
                for (const [eventName, actions] of stateMapToCombine) {
                    const existingEventPriority = eventPriority.get(eventName);
                    if (existingEventPriority && existingEventPriority < stateMapPriority) {
                        returnVal.set(eventName, actions);
                    }
                    else {
                        returnVal.set(eventName, [...(returnVal.get(eventName) || []), ...actions]);
                    }
                    eventPriority.set(eventName, stateMapPriority);
                }
            }
            return returnVal;
        };
        this.getActionsForEvent = () => {
            const stateMap = this.mergeStateMaps();
            return stateMap.get(this.data.event || '');
        };
        this.getActionTimers = (action) => {
            let returnVal = new Map();
            if (!(action === null || action === void 0 ? void 0 : action.timers)) {
                return returnVal;
            }
            let actionTimers = [];
            for (const timer of action.timers) {
                if (!timer.hoursDelay && !timer.minutesDelay && !timer.secondsDelay) {
                    continue;
                }
                const dateToFire = new Date();
                dateToFire.setHours(dateToFire.getHours() + ((timer === null || timer === void 0 ? void 0 : timer.hoursDelay) || 0), dateToFire.getMinutes() + ((timer === null || timer === void 0 ? void 0 : timer.minutesDelay) || 0), dateToFire.getSeconds() + ((timer === null || timer === void 0 ? void 0 : timer.secondsDelay) || 0));
                timer.epochTimeToFire = dateToFire.getTime();
                delete timer.hoursDelay;
                delete timer.minutesDelay;
                delete timer.secondsDelay;
                actionTimers.push(timer);
            }
            returnVal.set(`${action.triggeredByEvent}:${action.entity_id}`, actionTimers);
            return returnVal;
        };
        this.killExistingTimers = (timers) => {
            if (this.data.timers) {
                for (const [timerKey] of timers) {
                    const timersToKill = this.data.timers.get(timerKey);
                    if (timersToKill) {
                        for (const timerToKillId of timersToKill) {
                            clearInterval(timerToKillId);
                            this.data.timers.delete(timerKey);
                        }
                    }
                }
            }
        };
        this.setNewTimers = (timers) => {
            var _a;
            for (const [timersKey, timersToSet] of timers) {
                let timerIds = [];
                if (timersToSet) {
                    for (const timer of timersToSet) {
                        if (!timer.epochTimeToFire) {
                            continue;
                        }
                        const timeoutId = setTimeout(() => {
                            this.fireActions(timer.actions);
                            flow.set("stateData", this.data);
                        }, timer.epochTimeToFire - new Date().getTime());
                        timerIds.push(timeoutId);
                    }
                    (_a = this.data.timers) === null || _a === void 0 ? void 0 : _a.set(timersKey, timerIds);
                }
            }
        };
        this.fireActions = (actions) => {
            var _a, _b;
            let messagesToSend = null;
            let actionsToFire = [...actions].map(action => {
                if (!action.entity_id || (!action.setting && !action.getSetting)) {
                    return;
                }
                if (!action.setting && action.getSetting) {
                    action.setting = action.getSetting();
                }
                if (((action === null || action === void 0 ? void 0 : action.notifications) || []).length) {
                    messagesToSend = [...(messagesToSend || []), ...(action.notifications || [])];
                }
                return Object.assign({ entity_id: action.entity_id }, action.setting);
            });
            for (const action of actions) {
                this.data = Object.assign(Object.assign(Object.assign({}, this.data), action === null || action === void 0 ? void 0 : action.data), { home: Object.assign(Object.assign({}, (_a = this.data) === null || _a === void 0 ? void 0 : _a.home), (_b = action.data) === null || _b === void 0 ? void 0 : _b.home) });
            }
            node.send([actionsToFire, messagesToSend]);
        };
        this.getOnSetting = () => {
            var _a, _b, _c, _d;
            const currentDate = new Date();
            const currentHour = currentDate.getHours();
            const shouldBeWarm = currentHour < 8 ||
                currentHour > 20;
            const shouldBeNightLight = currentHour > 2 &&
                currentHour < 5 &&
                (((_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.phoneCharging) === null || _b === void 0 ? void 0 : _b.kyle) || ((_d = (_c = this.data) === null || _c === void 0 ? void 0 : _c.phoneCharging) === null || _d === void 0 ? void 0 : _d.molly));
            const returnVal = {
                state: 'on',
                color_temp: shouldBeWarm ? Warmth.SUNNY : Warmth.COOL,
            };
            return shouldBeNightLight ? this.getNightlightSetting() : returnVal;
        };
        this.getOffSetting = () => {
            const returnVal = {
                state: 'off',
            };
            return returnVal;
        };
        this.getNightlightSetting = (isBedroom) => {
            const returnVal = {
                state: !isBedroom ? 'on' : 'off',
                color_temp: Warmth.CANDLE,
                brightness_pct: 5,
            };
            return returnVal;
        };
        this.data = Object.assign(Object.assign({}, previousData), { timers: (previousData === null || previousData === void 0 ? void 0 : previousData.timers) || new Map(), home: (previousData === null || previousData === void 0 ? void 0 : previousData.home) || {}, event: (msg === null || msg === void 0 ? void 0 : msg.event) || '', sunAboveHorizon: (previousData === null || previousData === void 0 ? void 0 : previousData.sunAboveHorizon) || false, stateMap: [
                [
                    (data) => {
                        return [true, 0];
                    },
                    new Map([
                        ["dimmer01-on", [{ entity_id: 'light.office_lights', getSetting: this.getOnSetting, }]],
                        ["dimmer01-off", [{ entity_id: 'light.office_lights', getSetting: this.getOffSetting, }]],
                        ["dimmer01-up", [{ data: { motionSensorsDisabled: false } }]],
                        ["dimmer01-down", [{ data: { motionSensorsDisabled: true } }]],
                        ["kyle-home", [{ data: { home: { kyle: true } }, }]],
                        ["kyle-not_home", [{ data: { home: { kyle: false } }, }]],
                        ["molly-home", [{ data: { home: { molly: true } }, }]],
                        ["molly-not_home", [{ data: { home: { molly: false } }, }]],
                        ["phone-kyle-charging", [{ data: { phoneCharging: { kyle: true } }, }]],
                        ["phone-kyle-discharging", [{ data: { phoneCharging: { kyle: false } }, }]],
                        ["phone-molly-charging", [{ data: { phoneCharging: { molly: true } }, }]],
                        ["phone-molly-discharging", [{ data: { phoneCharging: { molly: false } }, }]],
                    ])
                ],
                [
                    (data) => {
                        return [!data.motionSensorsDisabled, 0];
                    },
                    new Map([
                        ["motion01-started", [
                                {
                                    entity_id: 'light.livingroom_lights', getSetting: this.getOnSetting, timers: [
                                        { minutesDelay: 5, actions: [{ entity_id: 'light.livingroom_lights', getSetting: this.getOffSetting }] }
                                    ]
                                }
                            ]],
                        ["motion02-started", [
                                {
                                    entity_id: 'light.kitchen_lights', getSetting: this.getOnSetting, timers: [
                                        { minutesDelay: 5, actions: [{ entity_id: 'light.kitchen_lights', getSetting: this.getOffSetting }] }
                                    ]
                                }
                            ]],
                        ["motion03-started", [
                                {
                                    entity_id: 'light.bedroom_lights', getSetting: this.getOnSetting, timers: [
                                        { minutesDelay: 5, actions: [{ entity_id: 'light.bedroom_lights', getSetting: this.getOffSetting }] }
                                    ]
                                }
                            ]],
                        ["motion04-started", [
                                {
                                    entity_id: 'light.bathroom_lights', getSetting: this.getOnSetting, timers: [
                                        { minutesDelay: 15, actions: [{ entity_id: 'light.bathroom_lights', getSetting: this.getOffSetting }] }
                                    ]
                                }
                            ]],
                    ])
                ],
                [
                    (data) => {
                        var _a, _b;
                        return [(!!((_a = data.home) === null || _a === void 0 ? void 0 : _a.kyle) && !((_b = data.home) === null || _b === void 0 ? void 0 : _b.molly) && !data.motionSensorsDisabled), 1];
                    },
                    new Map([
                        ["motion01-started", [
                                {
                                    entity_id: 'light.livingroom_lights', getSetting: this.getOnSetting, timers: [
                                        { minutesDelay: 2, actions: [{ entity_id: 'light.livingroom_lights', getSetting: this.getOffSetting }] }
                                    ]
                                }
                            ]],
                        ["motion02-started", [
                                {
                                    entity_id: 'light.kitchen_lights', getSetting: this.getOnSetting, timers: [
                                        { minutesDelay: 2, actions: [{ entity_id: 'light.kitchen_lights', getSetting: this.getOffSetting }] }
                                    ]
                                }
                            ]],
                        ["motion03-started", [
                                {
                                    entity_id: 'light.bedroom_lights', getSetting: this.getOnSetting, timers: [
                                        { minutesDelay: 2, actions: [{ entity_id: 'light.bedroom_lights', getSetting: this.getOffSetting }] }
                                    ]
                                }
                            ]],
                    ])
                ],
                [
                    (data) => {
                        var _a, _b;
                        return [(!!((_a = data.home) === null || _a === void 0 ? void 0 : _a.kyle) && !!((_b = data.home) === null || _b === void 0 ? void 0 : _b.molly) && !data.motionSensorsDisabled), 1];
                    },
                    new Map([
                        ["motion01-started", [
                                { entity_id: 'light.livingroom_lights', getSetting: this.getOnSetting, timers: [] }
                            ]],
                        ["motion02-started", [
                                { entity_id: 'light.kitchen_lights', getSetting: this.getOnSetting, timers: [] }
                            ]],
                        ["motion03-started", [
                                { entity_id: 'light.bedroom_lights', getSetting: this.getOnSetting, timers: [] }
                            ]],
                    ])
                ],
                [
                    (data) => {
                        var _a, _b;
                        if (((_a = data === null || data === void 0 ? void 0 : data.phoneCharging) === null || _a === void 0 ? void 0 : _a.molly) || ((_b = data === null || data === void 0 ? void 0 : data.phoneCharging) === null || _b === void 0 ? void 0 : _b.kyle)) {
                            return [true, 5];
                        }
                        return [false, 0];
                    },
                    new Map([
                        ['motion03-started', []]
                    ])
                ]
            ] });
        if (!(msg === null || msg === void 0 ? void 0 : msg.event) && (msg === null || msg === void 0 ? void 0 : msg.payload) && msg.topic) {
            const topicSplit = msg.topic.split('.');
            if (topicSplit[0] == 'person') {
                const username = topicSplit[1] || 'nobody';
                const event = (msg === null || msg === void 0 ? void 0 : msg.payload) || 'unknown';
                this.data.event = `${username}-${event}`;
            }
            if (topicSplit[0] == 'sun') {
                this.data.sunAboveHorizon = msg.payload === "above_horizon";
            }
        }
    }
}
//Load state
const state = new State(flow.get("stateData"), msg);
let actionsToFire = [];
//DoThings
if (state.data.event) {
    const actionsForEvent = state.getActionsForEvent();
    if (actionsForEvent) {
        actionsForEvent.map(action => {
            action.triggeredByEvent = state.data.event;
            return action;
        });
        delete state.data.event;
        actionsToFire = actionsToFire.concat(actionsForEvent);
    }
}
if (actionsToFire.length) {
    for (const action of actionsToFire) {
        const actionTimers = new Map(state.getActionTimers(action));
        state.killExistingTimers(actionTimers);
        state.setNewTimers(actionTimers);
    }
}
state.fireActions(actionsToFire);
//Save state
flow.set("stateData", state.data);
