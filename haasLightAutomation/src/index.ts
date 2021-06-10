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

const generateOnOffAction = (entity_id: string, state: 'off' | 'on') => {
  return {
    entity_id,
    setting: {
      state,
      brightness_pct: state == 'on' ? 100 : undefined,
      color_temp: state == 'on' ? 300 : undefined,
    }
  }
}

//Load state
const state = new State(flow.get("stateData"), msg);
state.data.home = {
  kyle: true,
  molly: false,
}

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
    const actionTimers = new Map(state.getActionTimers(action));
    state.killExistingTimers(actionTimers);
    state.setNewTimers(actionTimers)
  }
}

state.fireActions(actionsToFire);

//Save state
flow.set("stateData", state.data);