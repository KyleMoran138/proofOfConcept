
class Sensor {
    static names = {
        dimmer: {
            office: 'dm',
            bedroom: 'dm',
            kitchen: 'dm',
            bathroom: 'dm',
        },
        motion: {
            office: 'motion05',
            bedroom: 'motion03',
            kitchen: 'motion02',
            bathroom: 'motion04',
            livingroom: 'motion01',
        }
    }
    name: string = "";

    constructor(name: string){
        this.name = `sensor.${name}`;
    }
}

class MotionSensor extends Sensor {
    static keySuffixes = {
        lightLevel: '_light_level',
        motion: '_motion',
        temp: '_temperature',
    }

    static keyPrefixes = {
        motion: 'binary_',
    }

    constructor(name: string){
        super(name);
    }

    motion = (): boolean => {
        return getState()[`${MotionSensor.keyPrefixes.motion}${this.name}${MotionSensor.keySuffixes.motion}`];
    }

    lightLevel = (): number => {
        return getState()[`${this.name}${MotionSensor.keySuffixes.lightLevel}`];
    }

    temp = (): number => {
        return getState()[`${this.name}${MotionSensor.keySuffixes.temp}`];
    }
}

enum HueEvent {
    ON_PRESS = 1000,
    ON_HOLD = 1001,
    ON_RELEASE = 1002,
    ON_LONG_RELEASE = 1003,

    UP_PRESS = 2000,
    UP_HOLD = 2001,
    UP_RELEASE = 2002,
    UP_LONG_RELEASE = 2003,

    DOWN_PRESS = 3000,
    DOWN_HOLD = 3001,
    DOWN_RELEASE = 3002,
    DOWN_LONG_RELEASE = 3003,

    OFF_PRESS = 4000,
    OFF_HOLD = 4001,
    OFF_RELEASE = 4002,
    OFF_LONG_RELEASE = 4003,
}

interface RootMessage<T>{
    payload: {
        event_type?: string;
        entity_id?: string;
        event?: T;
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

interface ILightTempData {
    entity_id: string,
    state: "turn_on" | "turn_off" | 'toggle',
    brightness_pct: number,
    color_temp: number // can't remember the range rn
}

interface ILightColorData {
    entity_id: string,
    state: "turn_on" | "turn_off" | 'toggle',
    brightness_pct: number,
    rgb_color: [number, number, number],
}

interface ILightTempSetting extends IDelay, ILightTempData {}
interface ILightColorSetting extends IDelay, ILightColorData {}

type State = any;

type ActionStateChanged = {action: 'state_changed', payload: StateChange};
type ActionHueEvent = {action: 'hue_event', payload: IHueEvent};

type Action =
    ActionStateChanged |
    ActionHueEvent;

const messagesToFire: IDelay[] = [];
const motionSensors: Map<string, MotionSensor> = new Map([
    ['office', new MotionSensor(Sensor.names.motion.office)],
    ['kitchen', new MotionSensor('kitchen_motion')],
    ['bathroom', new MotionSensor('bathroom_motion')],
    ['livingroom', new MotionSensor('livingroom_motion')],
    ['bedroom', new MotionSensor('bedroom_motion')],
]);

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
    const state = getState();
    if(state['log-mute']){
        return;
    }
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

const translateToDispatch = (msg: RootMessage<unknown>) => {

    if(!msg || !msg.payload || !msg.payload.event_type){
        return;
    }

    if(msg.payload.event_type === 'state_changed' ){
        const actionData = (msg as RootMessage<RootStateChange<StateChange>>).payload.event;
        if(actionData && actionData.new_state){
            doDispatch({action: msg.payload.event_type, payload: actionData.new_state})
            return;
        }
    }

    if(msg.payload.event_type === 'hue_event'){
        const actionData = (msg as RootMessage<IHueEvent>).payload.event;
        if(actionData){
            doDispatch({action: msg.payload.event_type, payload: actionData})
        }
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
            runStateChangedEffects(action, state);
            return handleStateCanged(action, state);

        case 'hue_event':
            runHueEventEffects(action, state);
            return handleHueEvent(action, state);

        default:
            return {};
    }
}


// Services

const handleStateCanged = (action: ActionStateChanged, state: State): State => {
    if(includesAny( ['switch.nodered_', 'camera.', 'last_'], action.payload.entity_id)){
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

const handleHueEvent = (action: ActionHueEvent, state: State): State => {
    const eventIdAsString = (action.payload.event + '');

    // HELD
    if(eventIdAsString[3] === '1'){
        const countKey = `${action.payload.id}-count`;
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

    // LONG_RELEASED
    if(eventIdAsString[3] === '3'){
        return {
            [`${action.payload.id}-count`]: -1
        }
    }

}


// Effects

const runHueEventEffects = (action: ActionHueEvent, state: State) => {
    // Protect the state at all costs
    const setState = () => {log('INVALID SET STATE IN EFFECT')};

    if(action.payload.event === HueEvent.ON_RELEASE){
        log(action.payload.id)

    }



}

const runStateChangedEffects = (action: ActionStateChanged, state: State) => {
    // Protect the state at all costs
    const setState = () => {log('INVALID SET STATE IN EFFECT')};


}

//@ts-expect-error call main method with message
translateToDispatch(msg);

if(messagesToFire){
    //@ts-expect-error return messages from node
    return [messagesToFire];
}