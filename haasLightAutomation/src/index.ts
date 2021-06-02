import { Action } from './model/action';
import { Event } from './model/event';
import { SettingState } from './model/setting';
import { State } from './model/state';
import { Timer } from './model/timer';

let returnAction: Action;
let nextState: State;
let runAgainInstantly = false;
const functionHertz = 1;

const eventActions = new Map<string, Action[]>([
  ["dimmer01-on", [{entityId: 'lights.office_lights', setting: {brightness: 100, state: SettingState.ON}}]],
  ["dimmer01-off", [{entityId: 'lights.office_lights', setting: {state: SettingState.OFF}}]],
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

  msg.timers = persistingTimers;
  msg.events = elapsedEvents;
  msg.actions = handleActions([...msg.actions, ...allEventActions]);

  return [nextState, returnAction, runAgainInstantly];
}

const handleActions = (actions: Action[]): Action[] => {
  if(!actions){
    return [];
  }

  if(!returnAction){
    const possibleReturnAction = actions.shift();
    if(possibleReturnAction){
      returnAction = possibleReturnAction;
    }
  }

  if(actions.length > 1){
    runAgainInstantly = true;
  }

  return actions;
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
  return {
    timers: new Map().set(event.eventName, eventTimers.get(event.eventName)), 
    actions: eventActions.get(event.eventName) || []
  };
}

const handleTimers = (timers: Map<string, Timer>): {persistingTimers: Map<string, Timer>, elapsedEvents: Event[]} => {
  const elapsedEvents: Event[] = [];

  for (const [timerKey, timer] of timers) {
    if(!timer.epochTimeToFire){
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
    
    if(timer.epochTimeToFire < new Date().getTime()){
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

