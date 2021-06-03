
export interface Timer {
  epochTimeToFire?: number,
  secondsDelay?: number,
  minutesDelay?: number,
  hoursDelay?: number,
  eventToFire: string,
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

export interface Event {
  eventName: string,
  actions: Action[],
}

export interface FunctionState {
  events?: Event[],
  timers?: Map<string, Timer> | [string, Timer][],
  actions?: Action[],
  reRunInstantly?: boolean,
  home?: {
    [key: string]: boolean,
  }
}

export interface StateInterface {
  home?: {
    [key: string]: boolean,
  },
  sunAboveHorizon?: boolean,
}

export class State implements StateInterface{
  constructor(state?: StateInterface){
    this.home = state?.home;
    this.sunAboveHorizon = state?.sunAboveHorizon || false;
  }

  home?: {
    [key: string]: boolean,
  };
  sunAboveHorizon: boolean;

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
}

let returnAction: Action;
let nextState: FunctionState;
let currentState: State;

const settings = new Map<State, Map<string, Action[]>>([
  [
    new State({home: {kyle: true, molly: true}}),
    new Map([
      [
        "dimmer01-on",
        [
          {
            entityId: 'light.office_lights', 
            setting: {state: 'on', brightness: 255},
            timers:[
              {eventToFire: 'dimmer01-off', secondsDelay: 10}
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
      ]
    ])
  ]
]);


const loop = (msg: FunctionState) => {
  if(!msg.actions){
    msg.actions = [];
  }

  if(!msg.events){
    msg.events = [];
  }

  if(!msg.timers){
    msg.timers = new Map();
  }

  if(!msg.home){
    msg.home = {};
  }

  currentState = new State({
    home: msg.home || {}
  });

  const newEventActions = handleEvents(msg.events);

  const {
    actions,
    timers,
    reRunInstantly
  } = handleActions([...msg.actions, ...newEventActions]);

  const {
    persistingTimers,
    elapsedEvents,
  } = handleTimers(new Map([...msg.timers, ...timers]));

  msg.timers = Array.from(persistingTimers.entries());
  msg.events = elapsedEvents;
  msg.actions = actions;
  msg.reRunInstantly = reRunInstantly || !!elapsedEvents.length;
  nextState = msg;

  return [nextState, returnAction];
}

const handleActions = (actions: Action[]): {actions: Action[], timers: Map<string, Timer>, reRunInstantly: boolean} => {
  let rerun = false;
  let newTimers = new Map();

  if(!actions){
    return {actions: [], timers: new Map(), reRunInstantly: false};
  }

  for (const action of actions) {
    newTimers = new Map([...newTimers, ...handleAction(action)]);
  }

  if(!returnAction){
    const possibleReturnAction = actions.shift();
    if(possibleReturnAction){
      returnAction = possibleReturnAction;
    }
  }

  if(actions.length > 1){
    rerun = true;
  }

  return {actions, timers: newTimers, reRunInstantly: rerun};
}

const handleAction = (action: Action): Map<string, Timer> => {
  const returnValue = new Map();

  if(!action.timers || !action.triggeredByEvent){
    return returnValue;
  }

  for (const actionTimer of action.timers) {
    returnValue.set(`${action.triggeredByEvent}:${action.entityId}`, actionTimer);  
  }

  return returnValue;
}

const handleEvents = (events: Event[]): Action[] => {
  let returnValue: Action[] = [];
  
  for (const event of events) {
    let eventActions = getEventData(event.eventName) || [];
    
    eventActions = eventActions.map(eventAction => {
      eventAction.triggeredByEvent = event.eventName;
      return eventAction;
    });

    returnValue = [...returnValue, ...eventActions];
  }

  return returnValue;
}

const handleTimers = (timers: Map<string, Timer>): {persistingTimers: Map<string, Timer>, elapsedEvents: Event[]} => {
  const elapsedEvents: Event[] = [];

  for (const [timerKey, timer] of timers) {
    if(timer && !timer.epochTimeToFire){
      const now = new Date();
      const futureTime = new Date();
      
      futureTime.setHours(
        now.getHours() + (timer.hoursDelay || 0),
        now.getMinutes() + (timer.minutesDelay || 0),
        now.getSeconds() + (timer.secondsDelay || 0)
      );

      timer.epochTimeToFire = futureTime.getTime();
    }
    
    if(timer && timer.epochTimeToFire && (timer.epochTimeToFire < new Date().getTime())){
      elapsedEvents.push({
        eventName: timer.eventToFire,
        actions: [],
      }) ;
      timers.delete(timerKey); 
    }
  }
  

  return {elapsedEvents, persistingTimers: timers};
}

const getCurrentStateSettings = (): Map<string, Action[]> | undefined => {
  for (const [stateKey, stateSetting] of settings) {
    if(currentState.equal(stateKey)){
      return stateSetting;
    }
  }

  return;
}

const getEventData = (eventName: string): Action[] | undefined => {
  const currentStateSettings = getCurrentStateSettings();
  if(!currentStateSettings){
    return;
  }

  return currentStateSettings.get(eventName);
}