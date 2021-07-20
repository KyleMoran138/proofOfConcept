let flow: any = {
  get: () => {return {}},
  set: () => {},
}
let node: any = {
  send: (...anything: any[]) => {console.log('node send', anything)}
}
let msg: any = {
  event: 'dm1-on',
};

interface Timer {
  epochTimeToFire?: number,
  secondsDelay?: number,
  minutesDelay?: number,
  hoursDelay?: number,
  updateData?: boolean,
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
  getSetting?: () => Setting,
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
  event?: string,
  stateMap?: [(state: StateInterface) => [boolean, number?], Map<string, Action[]>][],
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

  constructor(previousData?: StateInterface, msg?: Input){
    this.data = {
      ...previousData,
      timers: previousData?.timers || new Map<string, number[]>(),
      event: msg?.event || '',
      sunAboveHorizon: previousData?.sunAboveHorizon || false,
      stateMap: [
        [ // Default state actions
          (data: StateInterface) => [true, 0],
          new Map([
            ["kyle-home", [{data: {kyleHome: true}, }]],
            ["kyle-not_home", [{data: {kyleHome: false}, }]],
            ["molly-home", [{data: {mollyHome: true}, }]],
            ["molly-not_home", [{data: {mollyHome: false}, }]],
            ["phone-kyle-charging", [{data: {kylePhoneCharging: true}, }]],
            ["phone-kyle-discharging", [{data: {kylePhoneCharging: false}, }]],
            ["phone-molly-charging", [{data: {mollyPhoneCharging: true}, }]],
            ["phone-molly-discharging", [{data: {mollyPhoneCharging: false}, }]],
          ])
        ],
        [ // Default dimmer actions
          (data: StateInterface) => [true, 0],
          new Map([
            ["dm1-on", [{entity_id: 'light.office_lights', getSetting: this.getOnSetting, }]],
            ["dm1-off", [{entity_id: 'light.office_lights', getSetting: this.getOffSetting, }]],
            ["dm1-on_long", [{entity_id: 'light.all_lights', getSetting: this.getOnSetting, }]],
            ["dm1-off_long", [{entity_id: 'light.all_lights', getSetting: this.getOffSetting, }]],
            ["dm1-up", [{data: {
              motion01Disabled: false,
              motion02Disabled: false,
              motion03Disabled: false,
              motion04Disabled: false,
              motion05Disabled: false,
            }}]],
            ["dm1-down", [{data: {
              motion01Disabled: true,
              motion02Disabled: true,
              motion03Disabled: true,
              motion05Disabled: true,
            }}]],

            ["dm4-on", [{entity_id: 'light.kitchen_lights', getSetting: this.getOnSetting, }]],
            ["dm4-off", [{entity_id: 'light.kitchen_lights', getSetting: this.getOffSetting, }]],

            ["dm3-on", [{entity_id: 'light.bedroom_lights', getSetting: this.getOnSetting, }]],
            ["dm3-off", [{entity_id: 'light.bedroom_lights', getSetting: this.getOffSetting, }]],

            ["dm2-off", [{
              entity_id: 'light.bathroom_lights',
              getSetting: this.getOnSetting,
              data: {motion04Disabled: true},
              timers: [{ hoursDelay: 1, actions: [{entity_id: 'light.bathroom_lights', getSetting: this.getOffSetting, data: {motion04Disabled: false}}]}],
            }]],

          ])
        ],
        [ // Default motion actions
          (data: StateInterface) => [true, 0],
          new Map([
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
        [ // Kyle home alone
          (data: StateInterface) => [(!!data.kyleHome && !data.mollyHome), 1],
          new Map([
            ["motion01-started", [
              {
                entity_id: 'light.livingroom_lights', getSetting: this.getOnSetting, timers: [
                  {minutesDelay: 2, actions: [{entity_id: 'light.livingroom_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["motion02-started", [
              {
                entity_id: 'light.kitchen_lights', getSetting: this.getOnSetting, timers: [
                  {minutesDelay: 2, actions: [{entity_id: 'light.kitchen_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["motion03-started", [
              {
                entity_id: 'light.bedroom_lights', getSetting: this.getOnSetting, timers: [
                  {minutesDelay: 2, actions: [{entity_id: 'light.bedroom_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["kyle-not_home", [
              {entity_id: 'light.all_lights', getSetting: this.getOffSetting}
            ]]
          ])
        ],
        [ // molly home
          (data: StateInterface) => [(!!data.mollyHome), 1],
          new Map([
            ["motion01-started", [
              {entity_id: 'light.livingroom_lights', getSetting: this.getOnSetting, timers: [
                {
                  minutesDelay: 30,
                  actions: [
                    {entity_id: 'light.livingroom_lights', getSetting: this.getOffSetting}
                  ]
                }
              ]}
            ]],
            ["motion02-started", [
              {entity_id: 'light.kitchen_lights', getSetting: this.getOnSetting, timers: [
                {
                  minutesDelay: 30,
                  actions: [
                    {entity_id: 'light.kitchen_lights', getSetting: this.getOffSetting}
                  ]
                }
              ]}
            ]],
            ["motion03-started", [
              {entity_id: 'light.bedroom_lights', getSetting: this.getOnSetting, timers: [
                {
                  minutesDelay: 30,
                  actions: [
                    {entity_id: 'light.bedroom_lights', getSetting: this.getOffSetting}
                  ]
                }
              ]}
            ]],
            ["molly-not_home", [
              {entity_id: 'light.all_lights', getSetting: this.getOffSetting}
            ]],
          ])
        ],
        [ // Bedtime
          (data: StateInterface) =>
          [
            (
              (new Date()).getHours() > 21 || (new Date()).getHours() < 9) &&
              ((data?.kyleHome && data?.kylePhoneCharging) ||
              (data?.mollyHome && data?.mollyPhoneCharging)
            ),
            5
          ],
          new Map([
            ['motion03-started', []],
            ["motion01-started", [
              {
                entity_id: 'light.livingroom_lights', getSetting: this.getNightlightSetting, timers: [
                  {minutesDelay: 3, actions: [{entity_id: 'light.livingroom_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["motion02-started", [
              {
                entity_id: 'light.kitchen_lights', getSetting: this.getNightlightSetting, timers: [
                  {minutesDelay: 3, actions: [{entity_id: 'light.kitchen_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
            ["motion04-started", [
              {
                entity_id: 'light.bathroom_lights', getSetting: this.getNightlightSetting, timers: [
                  {minutesDelay: 15, actions: [{entity_id: 'light.bathroom_lights', getSetting: this.getOffSetting}]}
                ]
              }
            ]],
          ])
        ],
        [ // motion01 disabled override
          (data: StateInterface) => [data?.motion01Disabled, 100],
          new Map([
            ["motion01-started", []],
          ]),
        ],
        [ // motion02 disabled override
          (data: StateInterface) => [data?.motion02Disabled, 100],
          new Map([
            ["motion02-started", []],
          ]),
        ],
        [ // motion03 disabled override
          (data: StateInterface) => [data?.motion03Disabled, 100],
          new Map([
            ["motion03-started", []],
          ]),
        ],
        [ // motion04 disabled override
          (data: StateInterface) => [data?.motion04Disabled, 100],
          new Map([
            ["motion04-started", []],
          ]),
        ],
        [ // motion05 disabled override
          (data: StateInterface) => [data?.motion05Disabled, 100],
          new Map([
            ["motion05-started", []],
          ]),
        ],

      ],
    };

    if(!msg?.event && msg?.payload && msg.topic){
      const topicSplit = msg.topic.split('.');
      if(topicSplit[0] == 'person'){
        const username = topicSplit[1] || 'nobody';
        const event = msg?.payload || 'unknown';
        this.data.event = `${username}-${event}`;
      }

      if(topicSplit[0] == 'sun'){
        this.data.sunAboveHorizon = msg.payload === "above_horizon"
      }
    }

  }

  getTrueStateMaps = (): [Map<string, Action[]>, number][] => {
    let returnVal: [Map<string, Action[]>, number][] = [];
    if(!this.data.stateMap) return returnVal;

    for (const [stateMapCheck, stateMapValue] of this.data.stateMap) {
      const [stateMapTrue, priority] = stateMapCheck(this.data);
      if(stateMapTrue){
        returnVal.push([stateMapValue, priority || 0]);
      }
    }

    return returnVal;
  }

  mergeStateMaps = (): Map<string, Action[]> => {
    let returnVal: Map<string, Action[]> = new Map();
    let eventPriority: Map<string, number> = new Map();
    const trueStateMaps = this.getTrueStateMaps();

    for (const [stateMapToCombine, stateMapPriority] of trueStateMaps) {
      for (const [eventName, actions] of stateMapToCombine) {
        const existingEventPriority = eventPriority.get(eventName);
        if(existingEventPriority && existingEventPriority < stateMapPriority){
          returnVal.set(eventName, actions);
        }else{
          returnVal.set(eventName, [...(returnVal.get(eventName) || []), ...actions]);
        }
        eventPriority.set(eventName, stateMapPriority);
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
      dateToFire.setHours(
        dateToFire.getHours() + (timer?.hoursDelay || 0),
        dateToFire.getMinutes() + (timer?.minutesDelay || 0),
        dateToFire.getSeconds() + (timer?.secondsDelay || 0)
      );
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
            this.fireActions(timer.actions, timer.updateData)
            flow.set("stateData", this.data)
          }, timer.epochTimeToFire - new Date().getTime())

          timerIds.push(timeoutId);
        }

        this.data.timers?.set(timersKey, timerIds);
      }
    }
  }

  fireActions = (actions: Action[], updateData: boolean = true) => {
    let messagesToSend: PushNotification[] | null = null;
    let actionsToFire = [...actions].map(action => {
      if(!action.entity_id || (!action.setting && !action.getSetting)){
        return;
      }

      if(!action.setting && action.getSetting){
        action.setting = action.getSetting();
      }

      if((action?.notifications || []).length){
        messagesToSend = [...(messagesToSend || []), ...(action.notifications || [])];
      }

      return {
        entity_id: action.entity_id,
        ...action.setting
      }
    });

    if(updateData){
      for (const action of actions) {
        this.data = {
          ...this.data,
          ...action?.data,
        };
      }
    }
    node.send([actionsToFire, messagesToSend]);
  }

  getOnSetting = (): Setting => {
    const currentHour = (new Date()).getHours();
    const shouldBeWarm =
      currentHour < 8 ||
      currentHour > 20;

    return {
      state: 'on',
      color_temp: shouldBeWarm ? Warmth.SUNNY : Warmth.COOL,
      brightness_pct: 100,
    };
  }

  getOffSetting = (): Setting => {
    const returnVal: Setting = {
      state: 'off',
    };

    return returnVal;
  }

  getNightlightSetting = (isBedroom?: boolean): Setting => {
    return {
      state: 'on',
      color_temp: Warmth.CANDLE,
      brightness_pct: 10,
    };
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