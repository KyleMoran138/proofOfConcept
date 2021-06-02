"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingState = void 0;
var SettingState;
(function (SettingState) {
    SettingState[SettingState["OFF"] = 0] = "OFF";
    SettingState[SettingState["ON"] = 1] = "ON";
})(SettingState = exports.SettingState || (exports.SettingState = {}));
let returnAction;
let nextState;
const eventActions = new Map([
    ["dimmer01-on", [{ entityId: 'lights.office_lights', setting: { brightness: 100, state: SettingState.ON } }]],
    ["dimmer01-off", [{ entityId: 'lights.office_lights', setting: { state: SettingState.OFF } }]],
]);
const eventTimers = new Map([
    ["dimmer01-on", { secondsDelay: 10, eventToFire: "dimmer01-off" }],
]);
const loop = (msg) => {
    if (!msg.actions) {
        msg.actions = [];
    }
    if (!msg.events) {
        msg.events = [];
    }
    if (!msg.timers) {
        msg.timers = new Map();
    }
    const { timers: allEventTimers, actions: allEventActions, } = handleEvents(msg.events);
    const { persistingTimers, elapsedEvents, } = handleTimers(new Map([...msg.timers, ...allEventTimers]));
    const { actions, reRunInstantly } = handleActions([...msg.actions, ...allEventActions]);
    msg.timers = persistingTimers;
    msg.events = elapsedEvents;
    msg.actions = actions;
    msg.reRunInstantly = reRunInstantly;
    return [nextState, returnAction];
};
const handleActions = (actions) => {
    let rerun = false;
    if (!actions) {
        return { actions: [], reRunInstantly: false };
    }
    if (!returnAction) {
        const possibleReturnAction = actions.shift();
        if (possibleReturnAction) {
            returnAction = possibleReturnAction;
        }
    }
    if (actions.length > 1) {
        rerun = true;
    }
    return { actions, reRunInstantly: rerun };
};
// Convert event to actions/timers
const handleEvents = (events) => {
    let returnValue = {
        timers: new Map(),
        actions: [],
    };
    for (const event of events) {
        const { timers: eventTimers, actions: eventActions } = handleEvent(event);
        returnValue.actions = [...returnValue.actions, ...eventActions];
        returnValue.timers = new Map([...returnValue.timers, ...eventTimers]);
    }
    return returnValue;
};
const handleEvent = (event) => {
    return {
        timers: new Map().set(event.eventName, eventTimers.get(event.eventName)),
        actions: eventActions.get(event.eventName) || []
    };
};
const handleTimers = (timers) => {
    const elapsedEvents = [];
    for (const [timerKey, timer] of timers) {
        if (!timer.epochTimeToFire) {
            const now = new Date();
            const futureTime = new Date();
            let invalidOffset = false;
            if (!timer.secondsDelay && !timer.minutesDelay && !timer.hoursDelay) {
                invalidOffset = true;
            }
            futureTime.setHours(now.getHours() + (timer.hoursDelay || 0), now.getMinutes() + (timer.minutesDelay || 0), now.getSeconds() + (timer.secondsDelay || 0));
            timer.epochTimeToFire = futureTime.getTime();
        }
        if (timer.epochTimeToFire < new Date().getTime()) {
            elapsedEvents.push({
                eventName: timer.eventToFire,
                actions: [],
                timers: [],
            });
            timers.delete(timerKey);
        }
    }
    return { elapsedEvents, persistingTimers: timers };
};
