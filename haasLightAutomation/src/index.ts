let flow: any;

interface Timer {
  epochTimeToFire?: number,
  secondsDelay?: number,
  minutesDelay?: number,
  hoursDelay?: number,
  event: string,
}

interface Setting{
  brightness?: number,
  state: "off" | "on",
  rgb_color?: [number, number, number],
  color_temp?: number,
}

interface Action {
  entityId: string,
  setting: Setting,
  timers?: Timer[],
  triggeredByEvent?: string,
}

interface StateInterface {
  events?: string[];
  timers?: Map<string, Map<string, Timer[]>>;
  actions?: Action[];
  home?: {
    [key: string]: boolean,
  }
  sunAboveHorizon?: boolean;
}


class State implements StateInterface {
  timers: Map<string, Map<string, Timer[]>> = new Map();
  home: {
    [key: string]: boolean,
  } = {};
  
  constructor(state?: StateInterface){
    let {timers, home,} = {...state};

    this.timers = timers || new Map();
  }

  stateMap = new Map<State, Map<string, Action[]>>([
    [
      new State({home: {kyle: true, molly: true}}),
      new Map([
        [
          "dimmer01-on",
          [
            {
              entityId: 'light.office_lights', 
              setting: {state: 'on', brightness: 100},
              timers:[
                {event: 'dimmer01-off', secondsDelay: 10}
              ]
            }
          ]
        ],
        [
          "test-on",
          [
            {
              entityId: 'light.office_lights', 
              setting: {state: 'on', brightness: 100},
              timers:[
                {event: 'dimmer01-off', secondsDelay: 10}
              ]
            }
          ]
        ],
        
        [
          "dimmer01-off",
          [
            {
              entityId: 'light.office_lights',
              setting: {state: 'off'},
              timers: []
            }
          ]
        ],
        [
          "kyle-home",
          [
            {
              entityId: 'light.office_lights',
              setting: {state: 'on', brightness: 100},
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
                        setting: { state: 'off'},
                        timers: []
                    }
                ]
            ],
            [
                "kitchen-off",
                [
                    {
                        entityId: 'light.kitchen_lights',
                        setting: { state: 'off'},
                        timers: []
                    }
                ]
            ],
            [
                "bedroom-off",
                [
                    {
                        entityId: 'light.bedroom_lights',
                        setting: { state: 'off'},
                        timers: []
                    }
                ]
            ],
            [
                "bathroom-off",
                [
                    {
                        entityId: 'light.bathroom_lights',
                        setting: { state: 'off'},
                        timers: []
                    }
                ]
            ],
            [
                "molly-not_home",
                [
                    {
                        entityId: 'light.office_lights',
                        setting: { state: 'on', color: [0,0,255], brightness: 100},
                        timers: []
                    }
                ]
            ]
        ])
    ]
  ]);

  _checkHomeEqual = (stateBHome?: {[key: string]: boolean}): boolean => {
    if(!this.home && !stateBHome){
      return true;
    }

    if(!stateBHome || !this.home){
      return false;
    }

    for (const personHome of Object.keys(stateBHome)) {
      if(this.home[personHome] !== stateBHome[personHome]){
        return false;
      }
    }

    return true;
  }
}