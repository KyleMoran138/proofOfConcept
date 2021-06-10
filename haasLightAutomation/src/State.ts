
class State {
  data: StateInterface;

  constructor(previousData?: StateInterface, inputs?: Input){
    
    if(!inputs?.event && inputs?.payload && inputs.topic){
      const username = inputs.topic.split('.')[1] || 'nobody';
      const event = inputs.payload;
      inputs.event = `${username}-${event}`;
    }

    this.data = {
      timers: previousData?.timers || new Map<string, number[]>(),
      home: previousData?.home || {kyle: false, molly: false},
      event: inputs?.event || '',
      sunAboveHorizon: previousData?.sunAboveHorizon || false,
      stateMap: new Map<StateInterface, Map<string, Action[]>>([
        [
          {home: {kyle: true, molly: false}},
          new Map([
            [
              "dimmer01-on", [
                {
                  entity_id: 'light.office_lights',
                  setting: {state: 'on'},
                  timers: [
                    {
                      secondsDelay: 10,
                      actions: [
                        {
                          entity_id: 'light.office_lights',
                          setting: {
                            state: 'off',
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
              "motion02-started", [
                {...generateOnOffAction('light.kitchen_lights', 'on'), timers: [{secondsDelay: 15, actions: [{...generateOnOffAction('light.kitchen_lights', 'off')}]}]}
              ]
            ]
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
          }, timer.epochTimeToFire - new Date().getTime())
  
          timerIds.push(timeoutId);
        }
  
        this.data.timers?.set(timersKey, timerIds);
      }
    }
  }

  fireActions = (actions: Action[]) => {
    let actionsToFire = [...actions].map(action => {
      return {
        entity_id: action.entity_id,
        ...action.setting
      }
    });

    for (const action of actions) {
      this.data = {...this.data, ...action?.newData};
    }

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
