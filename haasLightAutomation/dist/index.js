export class State {
    constructor(state) {
        this.events = [];
        this.timers = new Map();
        this.reRunInstantly = false;
        this.home = {};
        this.equal = (stateB) => {
            let returnVal = true;
            returnVal = returnVal && this._checkHomeEqual(stateB.home);
            return returnVal;
        };
        this.save = () => {
            flow.set("state", this);
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
        let { events, eventName, timers, home, } = Object.assign({}, state);
        this.events = [...(events || []), eventName || ''];
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
const loop = () => {
    const newState = new State(flow.get("state"));
    return [[]];
};
let flow;
