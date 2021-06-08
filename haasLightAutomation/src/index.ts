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
  timers?: Map<string, number[]>;
  sunAboveHorizon?: boolean;
  home?: {
    [key: string]: boolean,
  }
  event?: string,
  stateMap?: Map<StateInterface, Map<string, Action[]>>;
}

interface Input {
  event?: string;
}

class State {
  data: StateInterface;

  constructor(state?: Input, previousData?: StateInterface){
    this.data = {
      timers: previousData?.timers || new Map<string, number[]>(),
      home: previousData?.home || {},
      event: state?.event || '',
      sunAboveHorizon: previousData?.sunAboveHorizon || false,
      stateMap: previousData?.stateMap || new Map<StateInterface, Map<string, Action[]>>([
        [
          {home: {kyle: true, molly: false}},
          new Map([
            ["dimmer01-on", [{entityId: 'light.office_lights', setting: {state: 'on'}}]],
            ["dimmer01-off", [{entityId: 'light.office_lights', setting: {state: 'off'}}]]
          ])
        ]
      ]),
    }
  }

  matches = (stateB: StateInterface): boolean => {

    return this._checkHomeEqual(stateB.home);
  }

  getActionsForEvent = (): Action[] | undefined => {
    if(!this.data.stateMap){
      return;
    }

    for (const [stateMapKey, stateMap] of this.data.stateMap) {
      if(this.matches(stateMapKey)){
        return stateMap.get(this.data.event || '');
      }     
    }

    return;
  }

  getActionTimers = (action: Action): Map<string, Timer[]> =>{
    let returnVal = new Map();
    
    if(!action?.timers){
      return returnVal;
    }

    for (const timer of action.timers) {
      if(!timer.hoursDelay && !timer.minutesDelay && !timer.secondsDelay){
        continue;
      }  
      
      const dateToFire = new Date();
      dateToFire.setHours(dateToFire.getHours() + (timer?.hoursDelay || 0), dateToFire.getMinutes() + (timer?.minutesDelay || 0), dateToFire.getSeconds() + (timer?.secondsDelay || 0));
      timer.epochTimeToFire = dateToFire.getTime();
      
      delete timer.hoursDelay;
      delete timer.minutesDelay;
      delete timer.secondsDelay;

      returnVal.set(`${action.triggeredByEvent}:${action.entityId}`, timer);
      
    }

    return returnVal;
  }

  killExistingTimers = (timers: Map<string, Timer[]>) => {

  }

  setNewTimers = (timers: Map<string, Timer[]>) => {

  }

  _checkHomeEqual = (stateBHome?: {[key: string]: boolean}): boolean => {
    if(!this.data.home && !stateBHome){
      return true;
    }

    if(!stateBHome || !this.data.home){
      return false;
    }

    for (const personHome of Object.keys(stateBHome)) {
      if(this.data.home[personHome] !== stateBHome[personHome]){
        return false;
      }
    }

    return true;
  }
}

//Load state
const state = new State(flow.get("stateData"));

let actionsToFire: Action[] = [];
//DoThings
if(state.data.event){
  const actionsForEvent = state.getActionsForEvent();
  if(actionsForEvent){
    
    actionsForEvent.map(action => {
      action.triggeredByEvent = state.data.event;
      return action;
    })

    actionsToFire = actionsToFire.concat(actionsForEvent);
  }
}

if(actionsToFire.length){
  for (const action of actionsToFire) {
    const actionTimers = state.getActionTimers(action);
    state.killExistingTimers(actionTimers);
    state.setNewTimers(actionTimers)
  }
}

//Save state
flow.set("stateData", state.data);