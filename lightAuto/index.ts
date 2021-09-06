
class HueEvent {
    static ON_PRESS = 1000;
    static ON_HOLD = 1001;
    static ON_RELEASE = 1002;
    static ON_LONG_RELEASE = 1003;

    static UP_PRESS = 2000;
    static UP_HOLD = 2001;
    static UP_RELEASE = 2002;
    static UP_LONG_RELEASE = 2003;

    static DOWN_PRESS = 3000;
    static DOWN_HOLD = 3001;
    static DOWN_RELEASE = 3002;
    static DOWN_LONG_RELEASE = 3003;

    static OFF_PRESS = 4000;
    static OFF_HOLD = 4001;
    static OFF_RELEASE = 4002;
    static OFF_LONG_RELEASE = 4003;
}

interface RootMessage<T>{
    payload: {
        event_type: string;
        entity_id: string;
        event: T;
        origin?: string;
        time_fired?: string;
    }
}

interface RootStateChange<T>{
    entity_id: string;
    old_state?: T;
    new_state?: T;
}

interface StateChange{
    entity_id: string;
    state?: string | number | boolean;
    last_changed?: string;
    last_updated?: string;
}

interface IHueEvent {
    id: string,
    unique_id: string,
    event: number,
    last_updated: string,
}

interface Context{
    id: string;
    parent_id?: string;
    user_id?: string;
}

interface IDelay {
    topic: string,
    rate: number,
}

interface ILightSetting {
    entity_id: string,
    state: "on" | "off",
    brightness_pct: number,
    rgb_color: [number, number, number],
    color_temp: number // can't remember the range rn
}

type State = any;

type Action =
    {action: 'state_changed', payload: StateChange} |
    {action: 'hue_event', payload: IHueEvent};

// Helpers

const getState = (): State => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.get("state")
}

const setState = (state: State) => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.set("state", state)
}

const log = (...msg: any) => {
    //@ts-ignore node log
    node.warn(msg)
}

const includesAny = (arg: string[], toTest: string): boolean => {
    for (const value of arg) {
        if(toTest.includes(value)){
            return true;
        }
    }
    return false;
}

// Controller

const main = (msg: RootMessage<unknown>) => {

    if(msg.payload.event_type === 'state_changed' ){
        const actionData = (msg as RootMessage<RootStateChange<StateChange>>).payload.event;
        if(actionData.new_state){
            doDispatch({action: msg.payload.event_type, payload: actionData.new_state})
            return;
        }
    }

    if(msg.payload.event_type === 'hue_event'){
        const actionData = (msg as RootMessage<IHueEvent>).payload.event;
        doDispatch({action: msg.payload.event_type, payload: actionData})
        return;
    }
}

const doDispatch = (action: Action) => {
    const currentState = getState();
    const result: State = dispatch(action, currentState);
    const newState = {...currentState, ...result};
    setState(newState);
}

const dispatch = (action: Action, state: State) => {
    switch(action.action){
        case 'state_changed':
            return handleStateCanged(action, state);

        case 'hue_event':
            return handleHueEvent(action, state);

        default:
            return {};
    }
}

// Services

const handleStateCanged = (action: Action, state: State): State => {
    if(action.action !== 'state_changed' || includesAny( ['switch.nodered_', 'camera.', 'last_'], action.payload.entity_id)){
        return;
    }

    let newState = action.payload.state;
    if (action.payload.entity_id.includes('binary_sensor.')) {
        newState = newState === "on" ? true : false;
    }

    if (action.payload.entity_id.includes('light_level.')) {
        newState = Number(action.payload.state);
    }

    return {
        [action.payload.entity_id]: newState
    }
}

const handleHueEvent = (action: Action, state: State): State => {
    if(action.action !== 'hue_event'){
        return;
    }

    // PRESSED
    if((action.payload.event + '')[3] === '0'){
        log('PRESS');
    }

    // HELD
    if((action.payload.event + '')[3] === '1'){
        const countKey = `${action.payload.id}-count`;
        log('HOLD', state[`${countKey}`]);
        if(state[`${countKey}`] < 0){
            return {
                [`${countKey}`]: 1
            }
        }else {
            return {
                [`${countKey}`]: state[`${countKey}`] + 1
            }
        }
    }

    // RELEASED
    if((action.payload.event + '')[3] === '2'){
        log('RELEASE');
    }

    // LONG_RELEASED
    if((action.payload.event + '')[3] === '3'){
        log('LONG_RELEASE');
        return {
            [`${action.payload.id}-count`]: -1
        }
    }

}

//@ts-expect-error call main method with message
main(msg);