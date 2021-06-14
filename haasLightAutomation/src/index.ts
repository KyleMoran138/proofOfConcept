let flow: any = {
  get: () => {return {}},
  set: () => {},
}
let node: any = {
  send: (...anything: any[]) => {console.log('node send', anything)}
}
let msg: any = {
  event: 'dimmer01-on',
};

interface Timer {
  epochTimeToFire?: number,
  secondsDelay?: number,
  minutesDelay?: number,
  hoursDelay?: number,
  actions: Action[],
}

interface Setting{
  brightness_pct?: number,
  state: "off" | "on",
  rgb_color?: [number, number, number],
  color_temp?: number,
}

interface Action {
  entity_id?: string,
  setting?: Setting,
  timers?: Timer[],
  triggeredByEvent?: string,
  data?: any
}

interface StateInterface {
  timers?: Map<string, number[]>;
  sunAboveHorizon?: boolean;
  home?: {
    [key: string]: boolean,
  }
  event?: string,
  stateMap?: Map<(state: StateInterface) => boolean, Map<string, Action[]>>,
  [key: string]: any,
}

interface Input {
  event?: string;
  topic?: string;
  payload?: any;
}

class State {
  data: StateInterface;

  constructor(previousData?: StateInterface, state?: Input){

    if(!state?.event && state?.payload && state.topic){
      const topicSplit = state.topic.split('.');
      if(topicSplit[0] == 'person'){
        const username = topicSplit[1] || 'nobody';
        const event = state?.payload;
        state.event = `${username}-${event}`;
        node.warn(state.event)
      }

      if(topicSplit[0] == 'sun'){
        console.log('SUN!')
      }
    }

    this.data = {
      ...previousData,
      timers: previousData?.timers || new Map<string, number[]>(),
      home: previousData?.home || {},
      event: state?.event || '',
      sunAboveHorizon: previousData?.sunAboveHorizon || false,
      stateMap: new Map<(state: StateInterface) => boolean, Map<string, Action[]>>([
        [
          (data: StateInterface) => {
            return true;
          },
          new Map([
            [
              "dimmer01-on", [
                {
                  entity_id: 'light.office_lights',
                  setting: {state: 'on'},
                  newData: {test: true,},
                  timers: [
                    {
                      secondsDelay: 10,
                      actions: [
                        {
                          entity_id: 'light.office_lights',
                          setting: {
                            state: 'off',
                          },
                          newData: {
                            test: false,
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            ],
            ["dimmer01-off", [{entity_id: 'light.office_lights', setting: {state: 'off'}}]],
            [
              "kyle-home",
              [
                {data: {home: {kyle: true}}}
              ]
            ],
            [
              "kyle-not_home",
              [
                {data: {home: {kyle: false}}}
              ]
            ],
            
          ])
        ]
      ]),
    };
  }

  matches = (stateB: StateInterface): boolean => {

    return this._checkHomeEqual(stateB.home);
  }

  getActionsForEvent = (): Action[] | undefined => {

    if(this.data.stateMap){
      for (const [stateMapKey, stateMap] of this.data.stateMap) {
        if(stateMapKey(this.data)){
          return stateMap.get(this.data.event || '');
        }     
      }
    }

    return;
  }

  getActionTimers = (action: Action): Map<string, Timer[]> =>{
    let returnVal: Map<string, Timer[]> = new Map();
    
    if(!action?.timers){
      return returnVal;
    }
    
    let actionTimers: Timer[] = [];
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

      actionTimers.push(timer);
    }

    returnVal.set(`${action.triggeredByEvent}:${action.entity_id}`, actionTimers);
    
    return returnVal;
  }

  killExistingTimers = (timers: Map<string, Timer[]>) => {
    if(this.data.timers){
      for (const [timerKey] of timers) {
        const timersToKill = this.data.timers.get(timerKey);
        if(timersToKill){
          for (const timerToKillId of timersToKill) {
            clearInterval(timerToKillId);
            this.data.timers.delete(timerKey);
          }
        }
      }
    }
  }

  setNewTimers = (timers: Map<string, Timer[]>) => {
    for (const [timersKey, timersToSet] of timers) {
      let timerIds = [];
      if(timersToSet){
        for (const timer of timersToSet) {
          if(!timer.epochTimeToFire){
            continue;
          }
  
          const timeoutId = setTimeout(() => {
            this.fireActions(timer.actions)
            flow.set("stateData", this.data)
          }, timer.epochTimeToFire - new Date().getTime())
  
          timerIds.push(timeoutId);
        }
  
        this.data.timers?.set(timersKey, timerIds);
      }
    }
  }

  fireActions = (actions: Action[]) => {
    let actionsToFire = [...actions].map(action => {
      if(!action.entity_id || !action.setting){
        return;
      }

      return {
        entity_id: action.entity_id,
        ...action.setting
      }
    });

    for (const action of actions) {
      this.data = {...this.data, ...action?.data};
    }
    node.warn(['new data', this.data]);
    node.send([actionsToFire ,null]);
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
const state = new State(flow.get("stateData"), msg);

let actionsToFire: Action[] = [];
//DoThings
if(state.data.event){
  const actionsForEvent = state.getActionsForEvent();
  if(actionsForEvent){
    
    actionsForEvent.map(action => {
      action.triggeredByEvent = state.data.event;
      return action;
    })
    delete state.data.event;
    actionsToFire = actionsToFire.concat(actionsForEvent);
  }
}

if(actionsToFire.length){
  for (const action of actionsToFire) {
    const actionTimers = new Map(state.getActionTimers(action));
    state.killExistingTimers(actionTimers);
    state.setNewTimers(actionTimers)
  }
}

state.fireActions(actionsToFire);

//Save state
flow.set("stateData", state.data);