
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
}

export interface Action {
  entityId: string,
  setting: Setting,
}

export interface Event {
  eventName: string,
  actions: Action[],
  timers: Timer[],
}

export interface State {
  events?: Event[],
  timers?: Map<string, Timer> | [string, Timer][],
  actions?: Action[],
  reRunInstantly?: boolean,
}

let returnAction: Action;
let nextState: State;

const eventActions = new Map<string, Action[]>([
  ["dimmer01-on", [{entityId: 'light.office_lights', setting: {brightness: 100, state: "on"}}]],
  ["dimmer01-off", [{entityId: 'light.office_lights', setting: {state: "off"}}]],
]);

const eventTimers = new Map<string, Timer>([
  ["dimmer01-on", {secondsDelay: 10, eventToFire: "dimmer01-off"}],
]);


const loop = (msg: State) => {
  if(!msg.actions){
    msg.actions = [];
  }

  if(!msg.events){
    msg.events = [];
  }

  if(!msg.timers){
    msg.timers = new Map();
  }

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

// Convert event to actions/timers
const handleEvents = (events: Event[]): {timers: Map<string, Timer>, actions: Action[] } => {
  let returnValue: {timers: Map<string, Timer>, actions: Action[] } = {
    timers: new Map(),
    actions: [],
  }
  
  for (const event of events) {
    const {timers: eventTimers, actions: eventActions} = handleEvent(event);
    returnValue.actions = [...returnValue.actions, ...eventActions];
    returnValue.timers = new Map([...returnValue.timers, ...eventTimers]);
  }

  return returnValue;
}

const handleEvent = (event: Event): {timers: Map<string, Timer>, actions: Action[]} => {
  const eventTimer = eventTimers.get(event.eventName);
  const eventTimerMap = new Map().set(event.eventName, eventTimer);

  return {
    timers: eventTimer ? eventTimerMap : new Map(),
    actions: eventActions.get(event.eventName) || []
  };
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
