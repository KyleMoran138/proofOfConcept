
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
            setting: {state: 'on', brightness: 100},
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

  const { 
    timers: allEventTimers, 
    actions: allEventActions,
  } = handleEvents(msg.events);

  const {
    persistingTimers,
    elapsedEvents,
  } = handleTimers(new Map([...msg.timers, ...allEventTimers]));
  
  const {
    actions,
    reRunInstantly
  } = handleActions([...msg.actions, ...allEventActions]);

  msg.timers = Array.from(persistingTimers.entries());
  msg.events = elapsedEvents;
  msg.actions = actions;
  msg.reRunInstantly = reRunInstantly || !!elapsedEvents.length;
  nextState = msg;

  return [nextState, returnAction];
}

const handleActions = (actions: Action[]): {actions: Action[], reRunInstantly: boolean} => {
  let rerun = false;
  if(!actions){
    return {actions: [], reRunInstantly: false};
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

  return {actions, reRunInstantly: rerun};
}

const handleEvents = (events: Event[]): {timers: Map<string, Timer>, actions: Action[] } => {
  let returnValue: {timers: Map<string, Timer>, actions: Action[] } = {
    timers: new Map(),
    actions: [],
  }
  
  for (const event of events) {
    const eventData = getEventData(event.eventName);
    let eventActions: Action[] = [];
    let eventTimers: Timer[] = [];
    if(eventData){
      const {timers: eventTimers, actions: eventActions} = ;
      
    }

    returnValue.actions = [...returnValue.actions, ...eventActions];
    returnValue.timers = new Map([...returnValue.timers, ...eventTimers]);
  }

  return returnValue;
}

const handleTimers = (timers: Map<string, Timer>): {persistingTimers: Map<string, Timer>, elapsedEvents: Event[]} => {
  const elapsedEvents: Event[] = [];

  for (const [timerKey, timer] of timers) {
    if(timer && !timer.epochTimeToFire){
      const now = new Date();
      const futureTime = new Date();
      let invalidOffset = false;

      if(!timer.secondsDelay && !timer.minutesDelay && !timer.hoursDelay){
        invalidOffset = true;
      }
      
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
        timers: [],
      }) ;
      timers.delete(timerKey); 
    }
  }
  

  return {elapsedEvents, persistingTimers: timers};
}

const getCurrentStateSettings = (): Map<string,[Action[], Timer[]]> | undefined => {
  for (const [stateKey, stateSetting] of settings) {
    if(currentState.equal(stateKey)){
      return stateSetting;
    }
  }
  return;
}

const getEventData = (eventName: string): {actions: Action[], timers: Timer[]} | undefined => {
  const currentStateSettings = getCurrentStateSettings();
  if(!currentStateSettings){
    return;
  }

  const results = currentStateSettings.get(eventName);
  if(!results){
    return;
  }
  
  return {actions: results[0] || [], timers: results[1] || [] }
}