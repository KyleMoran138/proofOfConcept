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
        this.getOutput = () => {
            const actionToFire = this.actions.shift();
            const data = {
                timers: this.timers,
                events: this.events,
                actions: this.actions,
                home: this.home,
                sunAboveHorizon: this.sunAboveHorizon,
            };
            return [
                data,
                actionToFire,
                !!Array.from(this.timers.entries()).length || !!this.actions.length ? data : null,
            ];
        };
        const { events, actions, timers, home, } = Object.assign({}, state);
        this.events = events || [];
        this.actions = actions || [];
        this.timers = timers || new Map();
        this.home = home || {};
    }
}
const stateMap = new Map([
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
                            { event: 'dimmer01-off', secondsDelay: 10 }
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
                            { event: 'dimmer01-off', secondsDelay: 10 }
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
                                event: 'livingroom-off',
                                secondsDelay: 2,
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
                                event: 'kitchen-off',
                                secondsDelay: 5,
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
                                event: 'bedroom-off',
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
                                event: 'bathroom-off',
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
// Returns nextState, actiontoFire, shouldRunAnotherLoop
const loop = (msg) => {
    const newState = new State(msg);
    // Get actions
    newState.actions = convertEventsToActions(newState);
    // Get timers and timer events
    const [newAndPersistingTimers, eventsFiredByTimers] = processTimers(newState);
    newState.timers = newAndPersistingTimers;
    newState.events = [];
    newState.actions = [...newState.actions, ...convertEventsToActions(newState, eventsFiredByTimers)];
    return newState.getOutput();
};
const processTimers = (state) => {
    let eventsFiredByTimers = [];
    for (const [timerKey, timerArray] of state.timers) {
        const [persistingTimers, timerEvents] = processTimer(timerArray);
        eventsFiredByTimers = eventsFiredByTimers.concat(timerEvents);
        state.timers.set(timerKey, persistingTimers);
        if (!persistingTimers.length) {
            state.timers.delete(timerKey);
        }
    }
    return [new Map([...state.timers, ...getNewActionTimers(state)]), eventsFiredByTimers];
};
const processTimer = (timers) => {
    const persistingTimers = [];
    const eventsFiredByTimers = [];
    for (const timer of timers) {
        // This is going to bite me in the ass at some point
        if (!timer.epochTimeToFire) {
            continue;
        }
        if (timer.epochTimeToFire < new Date().getTime()) {
            eventsFiredByTimers.push(timer.event);
        }
        else {
            persistingTimers.push(timer);
        }
    }
    return [persistingTimers, eventsFiredByTimers];
};
const convertEventsToActions = (state, events) => {
    let returnValue = [];
    const eventMap = getEventMap(state);
    for (const event of events || state.events) {
        const eventActions = eventMap.get(event) || [];
        eventActions.map(action => {
            action.triggeredByEvent = event;
            return action;
        });
        returnValue = returnValue.concat(eventActions);
    }
    return returnValue;
};
const getNewActionTimers = (state) => {
    const returnVal = new Map();
    for (const action of state.actions) {
        const newActionTimers = getNewActionTimer(action.timers || []);
        if (newActionTimers.length) {
            returnVal.set(`${action.triggeredByEvent}:${action.entityId}`, newActionTimers);
        }
    }
    return returnVal;
};
const getNewActionTimer = (newTimers) => {
    const returnVal = [];
    for (const timer of newTimers) {
        if (!timer.epochTimeToFire) {
            const epochTimeToFire = new Date();
            epochTimeToFire.setHours(epochTimeToFire.getHours() + (timer.hoursDelay || 0), epochTimeToFire.getMinutes() + (timer.minutesDelay || 0), epochTimeToFire.getSeconds() + (timer.secondsDelay || 0));
            timer.epochTimeToFire = epochTimeToFire.getTime();
            delete timer.hoursDelay;
            delete timer.minutesDelay;
            delete timer.secondsDelay;
            returnVal.push(timer);
        }
    }
    return returnVal;
};
const getEventMap = (state) => {
    const returnVal = new Map();
    for (const [stateKey, eventMap] of stateMap) {
        if (state.equal(stateKey)) {
            return eventMap;
        }
    }
    return returnVal;
};



const initalState = {
    home: {
        molly: false,
        kyle: true,
    },
    events: ['motion01-started', 'motion02-started']
  };
  
  
  let state = initalState;
  let currentCount = 1;
  
  const runLoop = () => {
    let [newState, action, shouldRunAgain] = loop(state)
    state = newState
    
    console.log(`State[${currentCount}]:`, state, !!action, !!shouldRunAgain);
    currentCount++;
    if(!!shouldRunAgain){
      runLoop()
    }
  }
  
  runLoop();