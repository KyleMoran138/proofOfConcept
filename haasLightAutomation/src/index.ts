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
  getSetting?: (...params: any) => Setting,
  timers?: Timer[],
  triggeredByEvent?: string,
  data?: any,
  notifications?: PushNotification[],
}

interface PushNotification {
  message?: string,
  topic?: string,
}

interface StateInterface {
  timers?: Map<string, number[]>;
  sunAboveHorizon?: boolean;
  home?: {
    [key: string]: boolean,
  }
  event?: string,
  stateMap?: [(state: StateInterface) => boolean, Map<string, Action[]>][],
  [key: string]: any,
}

interface Input {
  event?: string;
  topic?: string;
  payload?: any;
}

enum Warmth {
  ICY=150,
  COOL=250,
  NEUTRAL=300,
  SUNNY=370,
  CANDLE=500,
}

class State {
  data: StateInterface;

  constructor(previousData?: StateInterface, state?: Input){
    this.data = {
      ...previousData,
      timers: previousData?.timers || new Map<string, number[]>(),
      home: previousData?.home || {},
      event: state?.event || '',
      sunAboveHorizon: previousData?.sunAboveHorizon || false,
      stateMap: [
        [
          (data: StateInterface) => {
            return true;
          },
          new Map([
            ["dimmer01-on", [{entity_id: 'light.office_lights', getSetting: this.getOnSetting, }]],
            ["dimmer01-off", [{entity_id: 'light.office_lights', getSetting: this.getOffSetting, }]],
            ["kyle-home", [{data: {home: {kyle: true}}, }]],
            ["kyle-not_home", [{data: {home: {kyle: false}}, }]],
            ["molly-home", [{data: {home: {molly: true}}, }]],
            ["molly-not_home", [{data: {home: {molly: false}}, }]],
            ["motion01-started", [
              {
                entity_id: 'light.livingroom_lights', getSetting: this.getOnSetting, timers: [
                  {minutesDelay: 5, actions: [{entity_id: 'light.livingroom_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["motion02-started", [
              {
                entity_id: 'light.kitchen_lights', getSetting: this.getOnSetting, timers: [
                  {minutesDelay: 5, actions: [{entity_id: 'light.kitchen_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["motion03-started", [
              {
                entity_id: 'light.bedroom_lights', getSetting: this.getOnSetting, timers: [
                  {minutesDelay: 5, actions: [{entity_id: 'light.bedroom_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["motion04-started", [
              {
                entity_id: 'light.bathroom_lights', getSetting: this.getOnSetting, timers: [
                  {minutesDelay: 15, actions: [{entity_id: 'light.bathroom_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
          ])
        ],
        [
          (data: StateInterface) => {
            return true;
          },
          new Map([
            ["dimmer01-on", [{entity_id: 'light.kitchen_lights', setting: {state: 'on'}}]],
          ])
        ],
        
      ],
    };

    if(!state?.event && state?.payload && state.topic){
      const topicSplit = state.topic.split('.');
      if(topicSplit[0] == 'person'){
        const username = topicSplit[1] || 'nobody';
        const event = state?.payload;
        state.event = `${username}-${event}`;
      }

      if(topicSplit[0] == 'sun'){
        this.data.sunAboveHorizon = state.payload === "above_horizon"
      }
    }

  }

  getTrueStateMaps = (): Map<string, Action[]>[] => {
    let returnVal: Map<string, Action[]>[] = [];
    if(!this.data.stateMap) return returnVal;

    for (const [stateMapCheck, stateMapValue] of this.data.stateMap) {
      if(stateMapCheck(this.data)){
        returnVal.push(stateMapValue);
      }
    }

    return returnVal;
  }

  mergeStateMaps = (): Map<string, Action[]> => {
    let returnVal: Map<string, Action[]> = new Map();
    const trueStateMaps = this.getTrueStateMaps();

    for (const stateMapToCombine of trueStateMaps) {
      for (const [eventName, actions] of stateMapToCombine) {
        returnVal.set(eventName, [...(returnVal.get(eventName) || []), ...actions]);
      }
    }

    return returnVal;
  }

  getActionsForEvent = (): Action[] | undefined => {
    const stateMap = this.mergeStateMaps();

    return stateMap.get(this.data.event || '');
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
    let messagesToSend: PushNotification[] | null = null;
    let actionsToFire = [...actions].map(action => {
      if(!action.entity_id || (!action.setting && !action.getSetting)){
        return;
      }

      if(!action.setting && action.getSetting){
        action.setting = action.getSetting(action.entity_id.includes('bedroom'));
      }

      if((action?.notifications || []).length){
        messagesToSend = [...(messagesToSend || []), ...(action.notifications || [])];
      }

      return {
        entity_id: action.entity_id,
        ...action.setting
      }
    });

    for (const action of actions) {
      this.data = {...this.data, ...action?.data};
    }
    node.send([actionsToFire, messagesToSend]);
  }

  getOnSetting = (isBedroom?: boolean): Setting => {
    const currentDate = new Date();
    const shouldBeWarm = 
      currentDate.getHours() < 8 ||
      currentDate.getHours() > 20;
    const shouldBeNightLight = 
      (currentDate.getHours() > 2 && currentDate.getMinutes() >= 30) &&
      currentDate.getHours() < 5;
    const returnVal: Setting = {
      state: 'on',
      color_temp: shouldBeWarm ? Warmth.SUNNY : Warmth.COOL,
    };

    return shouldBeNightLight ? this.getNightlightSetting() : returnVal;
  }

  getOffSetting = (): Setting => {
    const returnVal: Setting = {
      state: 'off',
    };

    return returnVal;
  }

  getNightlightSetting = (isBedroom?: boolean): Setting => {
    const returnVal: Setting = {
      state: !isBedroom ? 'on' : 'off',
      color_temp: Warmth.CANDLE,
      brightness_pct: 5,
    };

    return returnVal;
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