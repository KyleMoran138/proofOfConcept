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
const defaultStateMap = new Map([
    [
        "kyle-home",
        [{ data: { home: { kyle: true } } }]
    ],
    [
        "kyle-not-home",
        [{ data: { home: { kyle: false } } }]
    ],
    [
        "molly-home",
        [{ data: { home: { molly: true } } }]
    ],
    [
        "molly-not-home",
        [{ data: { home: { molly: false } } }]
    ],
]);
class State {
    constructor(previousData, state) {
        this.matches = (stateB) => {
            return this._checkHomeEqual(stateB.home);
        };
        this.getActionsForEvent = () => {
            if (this.data.stateMap) {
                for (const [stateMapKey, stateMap] of this.data.stateMap) {
                    if (this.matches(stateMapKey)) {
                        return stateMap.get(this.data.event || '');
                    }
                }
            }
            return defaultStateMap.get(this.data.event || '');
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
            let actionsToFire = [...actions].map(action => {
                if (!action.entity_id || !action.setting) {
                    return;
                }
                return Object.assign({ entity_id: action.entity_id }, action.setting);
            });
            for (const action of actions) {
                this.data = Object.assign(Object.assign({}, this.data), action === null || action === void 0 ? void 0 : action.data);
            }
            node.send([actionsToFire, null]);
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
        if (!(previousData === null || previousData === void 0 ? void 0 : previousData.event) && (previousData === null || previousData === void 0 ? void 0 : previousData.payload) && previousData.topic) {
            const topicSplit = previousData.topic.split('.');
            if (topicSplit[0] == 'person') {
                const username = [1] || 'nobody';
                const event = previousData.payload;
                previousData.event = `${username}-${event}`;
            }
            if (topicSplit[0] == 'sun') {
                console.log('SUN!');
            }
        }
        this.data = Object.assign(Object.assign({}, previousData), { timers: (previousData === null || previousData === void 0 ? void 0 : previousData.timers) || new Map(), home: (previousData === null || previousData === void 0 ? void 0 : previousData.home) || {}, event: (state === null || state === void 0 ? void 0 : state.event) || '', sunAboveHorizon: (previousData === null || previousData === void 0 ? void 0 : previousData.sunAboveHorizon) || false, stateMap: new Map([
                [
                    { home: { kyle: true, molly: false } },
                    new Map([
                        [
                            "dimmer01-on", [
                                {
                                    entity_id: 'light.office_lights',
                                    setting: { state: 'on' },
                                    newData: { test: true, },
                                    timers: [
                                        {
                                            secondsDelay: 10,
                                            actions: [
                                                {
                                                    entity_id: 'light.office_lights',
                                                    setting: {
                                                        state: 'off',
                                                    },
                                                    newData: {
                                                        test: false,
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        ],
                        ["dimmer01-off", [{ entity_id: 'light.office_lights', setting: { state: 'off' } }]]
                    ])
                ]
            ]) });
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
