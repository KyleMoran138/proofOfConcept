"use strict";
let flow = {}, node = {}, msg = {};
node.send = console.log;
flow.set = console.log;
flow.get = (attr) => {return {}}

class State {
    constructor(previousData, state) {
        this.matches = (stateB) => {
            return this._checkHomeEqual(stateB.home);
        };
        this.getActionsForEvent = () => {
            if (!this.data.stateMap) {
                return;
            }
            for (const [stateMapKey, stateMap] of this.data.stateMap) {
                if (this.matches(stateMapKey)) {
                    return stateMap.get(this.data.event || '');
                }
            }
            return;
        };
        this.getActionTimers = (action) => {
            let returnVal = new Map();
            if (!(action === null || action === void 0 ? void 0 : action.timers)) {
                return returnVal;
            }
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
                returnVal.set(`${action.triggeredByEvent}:${action.entityId}`, timer);
            }
            return returnVal;
        };
        this.killExistingTimers = (timers) => {
            console.log('kill existing', timers)
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
            console.log('set new', timers)
            var _a;
            for (const [timersKey, timersToSet] of timers) {
                let timerIds = [];
                for (const timer of timersToSet) {
                    if (!timer.epochTimeToFire) {
                        continue;
                    }
                    const timeoutId = setTimeout(() => {
                        node.send([[timer.actions, null]]);
                    }, timer.epochTimeToFire - new Date().getTime());
                    timerIds.push(timeoutId);
                }
                (_a = this.data.timers) === null || _a === void 0 ? void 0 : _a.set(timersKey, timerIds);
            }
        };
        this._checkHomeEqual = (stateBHome) => {
            if (!this.data.home && !stateBHome) {
                return true;
            }
            if (!stateBHome || !this.data.home) {
                return false;
            }
            for (const personHome of Object.keys(stateBHome)) {
                if (this.data.home[personHome] !== stateBHome[personHome]) {
                    return false;
                }
            }
            return true;
        };
        this.data = {
            timers: (previousData === null || previousData === void 0 ? void 0 : previousData.timers) || new Map(),
            home: (previousData === null || previousData === void 0 ? void 0 : previousData.home) || {},
            event: (state === null || state === void 0 ? void 0 : state.event) || '',
            sunAboveHorizon: (previousData === null || previousData === void 0 ? void 0 : previousData.sunAboveHorizon) || false,
            stateMap: (previousData === null || previousData === void 0 ? void 0 : previousData.stateMap) || new Map([
                [
                    { home: { kyle: true, molly: false } },
                    new Map([
                        [
                            "dimmer01-on", [
                                {
                                    entityId: 'light.office_lights',
                                    setting: { state: 'on' },
                                    timers: [
                                        {
                                            secondsDelay: 10,
                                            actions: [
                                                {
                                                    entityId: 'light.office_lights',
                                                    setting: {
                                                        state: 'off',
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        ],
                        ["dimmer01-off", [{ entityId: 'light.office_lights', setting: { state: 'off' } }]]
                    ])
                ]
            ]),
        };
    }
}
//Load state
const state = new State(flow.get("stateData"), msg);
let actionsToFire = [];
state.data.event = "dimmer01-on"
state.data.home = {kyle: true, molly: false}
//DoThings
if (state.data.event) {
    const actionsForEvent = state.getActionsForEvent();
    console.log('wot?', actionsForEvent)
    if (actionsForEvent) {
        actionsForEvent.map(action => {
            action.triggeredByEvent = state.data.event;
            return action;
        });
        console.log('actions for event', actionsForEvent)
        actionsToFire = actionsToFire.concat(actionsForEvent);
    }
}
console.log('actions to fire', actionsToFire.length)
if (actionsToFire.length) {
    for (const action of actionsToFire) {
        const actionTimers = state.getActionTimers(action);
        console.log('action timers');
        state.killExistingTimers(actionTimers);
        state.setNewTimers(actionTimers);
    }
}
node.send([actionsToFire, null]);
//Save state
flow.set("stateData", state.data);
