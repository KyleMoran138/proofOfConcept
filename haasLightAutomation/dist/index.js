class State {
    constructor(state) {
        this.events = [];
        this.timers = new Map();
        this.actions = [];
        this.reRunInstantly = false;
        this.home = {};
        this.sunAboveHorizon = false;
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
        const { events, actions, timers, home, } = Object.assign({}, state);
        this.events = events || [];
        this.actions = actions || [];
        this.timers = timers || new Map();
        this.home = home || {};
    }
}
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
                "test-on",
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
    ],
    [
        new State({ home: { kyle: true, molly: false } }),
        new Map([
            [
                "dimmer01-on",
                [
                    {
                        entityId: 'light.office_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: []
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
                "dimmer01-on_long",
                [
                    {
                        entityId: 'light.all_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: []
                    }
                ]
            ],
            [
                "dimmer01-off_long",
                [
                    {
                        entityId: 'light.all_lights',
                        setting: { state: 'off' },
                        timers: []
                    }
                ]
            ],
            [
                "motion01-started",
                [
                    {
                        entityId: 'light.livingroom_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: [
                            {
                                eventToFire: 'livingroom-off',
                                secondsDelay: 10,
                            }
                        ]
                    }
                ]
            ],
            [
                "motion02-started",
                [
                    {
                        entityId: 'light.kitchen_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: [
                            {
                                eventToFire: 'kitchen-off',
                                secondsDelay: 10,
                            }
                        ]
                    }
                ]
            ],
            [
                "motion03-started",
                [
                    {
                        entityId: 'light.bedroom_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: [
                            {
                                eventToFire: 'bedroom-off',
                                minutesDelay: 1,
                            }
                        ]
                    }
                ]
            ],
            [
                "motion04-started",
                [
                    {
                        entityId: 'light.bathroom_lights',
                        setting: { state: 'on', brightness: 100 },
                        timers: [
                            {
                                eventToFire: 'bathroom-off',
                                minutesDelay: 10,
                            }
                        ]
                    }
                ]
            ],
            [
                "livingroom-off",
                [
                    {
                        entityId: 'light.livingroom_lights',
                        setting: { state: 'off' },
                        timers: []
                    }
                ]
            ],
            [
                "kitchen-off",
                [
                    {
                        entityId: 'light.kitchen_lights',
                        setting: { state: 'off' },
                        timers: []
                    }
                ]
            ],
            [
                "bedroom-off",
                [
                    {
                        entityId: 'light.bedroom_lights',
                        setting: { state: 'off' },
                        timers: []
                    }
                ]
            ],
            [
                "bathroom-off",
                [
                    {
                        entityId: 'light.bathroom_lights',
                        setting: { state: 'off' },
                        timers: []
                    }
                ]
            ],
            [
                "molly-not_home",
                [
                    {
                        entityId: 'light.office_lights',
                        setting: { state: 'on', color: [0, 0, 255], brightness: 100 },
                        timers: []
                    }
                ]
            ]
        ])
    ]
]);
let currentState;
const loop = (msg) => {
    currentState = new State(msg);
    const nextState = Object.assign({}, currentState);
    const newEventActions = handleEvents(msg.events || []);
    const { actions, timers, returnAction } = handleActions([...(nextState.actions || []), ...newEventActions]);
    const { persistingTimers, elapsedEvents, } = handleTimers(new Map([...(nextState.timers || []), ...timers]));
    nextState.timers = persistingTimers;
    nextState.events = elapsedEvents;
    nextState.actions = actions;
    nextState.reRunInstantly = !!nextState.actions.length || !!nextState.events;
    return [nextState, returnAction];
};
const handleActions = (actions) => {
    let newTimers = new Map();
    let returnAction;
    if (!actions) {
        return { actions: [], timers: new Map() };
    }
    for (const action of actions) {
        newTimers = new Map([...newTimers, ...handleAction(action)]);
    }
    returnAction = actions.shift();
    return { actions, timers: newTimers, returnAction };
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
