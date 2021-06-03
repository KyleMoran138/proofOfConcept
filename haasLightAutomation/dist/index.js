export class State {
    constructor(state) {
        this.equal = (stateB) => {
            let returnVal = true;
            returnVal = returnVal && this._checkHomeEqual(stateB.home);
            returnVal = returnVal && (this.sunAboveHorizon === stateB.sunAboveHorizon);
            return returnVal;
        };
        this._checkHomeEqual = (stateBHome) => {
            if (!this.home && !stateBHome) {
                return true;
            }
            if (!stateBHome || !this.home) {
                return false;
            }
            for (const personHome of Object.keys(stateBHome)) {
                if (this.home[personHome] !== stateBHome[personHome]) {
                    return false;
                }
            }
            return true;
        };
        this.home = state === null || state === void 0 ? void 0 : state.home;
        this.sunAboveHorizon = (state === null || state === void 0 ? void 0 : state.sunAboveHorizon) || false;
    }
}
let returnAction;
let nextState;
let currentState;
const settings = new Map([
    [
        new State({ home: { kyle: true, molly: true } }),
        new Map([
            [
                "dimmer01-on",
                [
                    {
                        entityId: 'light.office_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: [
                            { eventToFire: 'dimmer01-off', secondsDelay: 10 }
                        ]
                    }
                ]
            ],
            [
                "dimmer01-off",
                [
                    {
                        entityId: 'light.office_lights',
                        setting: { state: 'off' },
                        timers: []
                    }
                ]
            ],
            [
                "kyle-home",
                [
                    {
                        entityId: 'light.office_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: []
                    }
                ]
            ]
        ])
    ]
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
    if (!msg.home) {
        msg.home = {};
    }
    currentState = new State({
        home: msg.home || {}
    });
    const newEventActions = handleEvents(msg.events);
    const { actions, timers, reRunInstantly } = handleActions([...msg.actions, ...newEventActions]);
    const { persistingTimers, elapsedEvents, } = handleTimers(new Map([...msg.timers, ...timers]));
    msg.timers = Array.from(persistingTimers.entries());
    msg.events = elapsedEvents;
    msg.actions = actions;
    msg.reRunInstantly = reRunInstantly || !!elapsedEvents.length;
    nextState = msg;
    return [nextState, returnAction];
};
const handleActions = (actions) => {
    let rerun = false;
    let newTimers = new Map();
    if (!actions) {
        return { actions: [], timers: new Map(), reRunInstantly: false };
    }
    for (const action of actions) {
        newTimers = new Map([...newTimers, ...handleAction(action)]);
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
    return { actions, timers: newTimers, reRunInstantly: rerun };
};
const handleAction = (action) => {
    const returnValue = new Map();
    if (!action.timers || !action.triggeredByEvent) {
        return returnValue;
    }
    for (const actionTimer of action.timers) {
        returnValue.set(`${action.triggeredByEvent}:${action.entityId}`, actionTimer);
    }
    return returnValue;
};
const handleEvents = (events) => {
    let returnValue = [];
    for (const event of events) {
        let eventActions = getEventData(event.eventName) || [];
        eventActions = eventActions.map(eventAction => {
            eventAction.triggeredByEvent = event.eventName;
            return eventAction;
        });
        returnValue = [...returnValue, ...eventActions];
    }
    return returnValue;
};
const handleTimers = (timers) => {
    const elapsedEvents = [];
    for (const [timerKey, timer] of timers) {
        if (timer && !timer.epochTimeToFire) {
            const now = new Date();
            const futureTime = new Date();
            futureTime.setHours(now.getHours() + (timer.hoursDelay || 0), now.getMinutes() + (timer.minutesDelay || 0), now.getSeconds() + (timer.secondsDelay || 0));
            timer.epochTimeToFire = futureTime.getTime();
        }
        if (timer && timer.epochTimeToFire && (timer.epochTimeToFire < new Date().getTime())) {
            elapsedEvents.push({
                eventName: timer.eventToFire,
                actions: [],
            });
            timers.delete(timerKey);
        }
    }
    return { elapsedEvents, persistingTimers: timers };
};
const getCurrentStateSettings = () => {
    for (const [stateKey, stateSetting] of settings) {
        if (currentState.equal(stateKey)) {
            return stateSetting;
        }
    }
    return;
};
const getEventData = (eventName) => {
    const currentStateSettings = getCurrentStateSettings();
    if (!currentStateSettings) {
        return;
    }
    return currentStateSettings.get(eventName);
};
