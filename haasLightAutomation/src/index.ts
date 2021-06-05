
export interface Timer {
  epochTimeToFire?: number,
  secondsDelay?: number,
  minutesDelay?: number,
  hoursDelay?: number,
  event: string,
}

export interface Setting{
  brightness?: number,
  state: "off" | "on",
  rgb_color?: [number, number, number],
  color_temp?: number,
}

export interface Action {
  entityId: string,
  setting: Setting,
  timers?: Timer[],
  triggeredByEvent?: string,
}

export interface StateInterface {
  events?: string[];
  timers?: Map<string, Timer[]>;
  actions?: Action[];
  reRunInstantly?: boolean;
  home?: {
    [key: string]: boolean,
  }
  sunAboveHorizon?: boolean;
}

export class State implements StateInterface{

  events: string[] = [];
  timers: Map<string, Timer[]> = new Map();
  actions: Action[] = [];
  reRunInstantly = false;
  home?: {
    [key: string]: boolean,
  } = {};
  sunAboveHorizon = false;
  
  constructor(state?: StateInterface){
    const {
      events, 
      actions,
      timers,
      home,
    } = {...state};

    this.events = events || [];
    this.actions = actions || [];
    this.timers = timers || new Map();
    this.home = home || {};
  }

  equal = (stateB: State): boolean => {
    let returnVal = true;
    
    returnVal = returnVal && this._checkHomeEqual(stateB.home);
    returnVal = returnVal && (this.sunAboveHorizon === stateB.sunAboveHorizon);

    return returnVal
  }

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

  getOutput = (): [StateInterface, Action | undefined, StateInterface | null] => {
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
    ]
  }
}

const stateMap = new Map<State, Map<string, Action[]>>([
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

// Returns nextState, actiontoFire, shouldRunAnotherLoop
const loop = (msg: StateInterface): [StateInterface | undefined, Action | undefined, StateInterface | null] => {
  const newState = new State(msg);

  // Get actions
  newState.actions = convertEventsToActions(newState);

  // Get timers and timer events
  const [
    newAndPersistingTimers,
    eventsFiredByTimers
  ] = processTimers(newState);

  newState.timers = newAndPersistingTimers;
  newState.events = [];

  newState.actions = [...newState.actions, ...convertEventsToActions(newState, eventsFiredByTimers)];

  return newState.getOutput();
}

const processTimers = (state: State): [Map<string, Timer[]>, string[]] => {
  let eventsFiredByTimers: string[] = [];

  for (const [timerKey, timerArray] of state.timers) {
    const [persistingTimers, timerEvents] = processTimer(timerArray);
    eventsFiredByTimers = eventsFiredByTimers.concat(timerEvents);
    state.timers.set(timerKey, persistingTimers);
    if(!persistingTimers.length){
      state.timers.delete(timerKey);
    }
  }

  return [new Map([ ...state.timers, ...getNewActionTimers(state)]), eventsFiredByTimers];
}

const processTimer = (timers: Timer[]): [Timer[], string[]] => {
  const persistingTimers: Timer[] = [];
  const eventsFiredByTimers: string[] = [];

  for (const timer of timers) {
    // This is going to bite me in the ass at some point
    if(!timer.epochTimeToFire){
      continue;
    }

    if(timer.epochTimeToFire < new Date().getTime()){
      eventsFiredByTimers.push(timer.event);
    }else{
      persistingTimers.push(timer);
    }
  }

  return [persistingTimers, eventsFiredByTimers]
}

const convertEventsToActions = (state: State, events?: string[]): Action[] => {
  let returnValue: Action[] = [];
  const eventMap = getEventMap(state);

  for (const event of events || state.events) {
    const eventActions = eventMap.get(event) || [];

    eventActions.map(action => {
      action.triggeredByEvent = event;
      return action;
    })

    returnValue = returnValue.concat(eventActions);
  }

  return returnValue;
}

const getNewActionTimers = (state: State): Map<string, Timer[]> => {
  const returnVal = new Map();

  for (const action of state.actions) {
    const newActionTimers = getNewActionTimer(action.timers || []);
    if(newActionTimers.length){
      returnVal.set(`${action.triggeredByEvent}:${action.entityId}`, newActionTimers);
    }
  }

  return returnVal;
};

const getNewActionTimer = (newTimers: Timer[]): Timer[] => {
  const returnVal: Timer[] = [];

  for (const timer of newTimers) {
    if(!timer.epochTimeToFire){
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
}

const getEventMap = (state: State): Map<string, Action[]> => {
  const returnVal = new Map();

  for (const [stateKey, eventMap] of stateMap) {
    if(state.equal(stateKey)){
      return eventMap;
    }
  }

  return returnVal;
}