
class Sensor {
    static names = {
        dimmer: {
            office: 'dm1',
            bedroom: 'dm3',
            kitchen: 'dm4',
            bathroom: 'dm2',
        },
        motion: {
            office: 'binary_sensor.motion05',
            bedroom: 'binary_sensor.bedroom_motion',
            kitchen: 'binary_sensor.kitchen_motion',
            bathroom: 'binary_sensor.bathroom_motion',
            livingroom: 'binary_sensor.living_room_motion',
        },
        people: {
            kyle: {
                home: 'device_tracker.kyles_phone',
                phoneCharging: 'binary_sensor.kyles_phone_is_charging',
                sleepConfidence: 'sensor.pixel_3_sleep_confidence'
            },
            molly: {
                home: 'device_tracker.molly_s_phone',
                phoneCharging: 'binary_sensor.molly_s_phone_is_charging',
                sleepConfidence: 'sensor.molly_s_phone_sleep_confidence'
            }
        },
        light: {
            livingroom: 'light.livingroom_lights',
            office: 'light.office_lights',
            kitchen: 'light.kitchen_lights',
            bathroom: 'light.bathroom_lights',
            bedroom: 'light.bedroom_lights',
        }
    }

}

class Profile {
    name: string = ""
    stateMap: IValueCheck[] = [];
    runStateChangedEffects?: (action: ActionStateChanged, state: State) => void
    runHueEventEffects?: (action: ActionHueEvent, state: State) => void

    constructor(
        name: string, 
        stateMap: IValueCheck[], 
        runStateChangedEffects?: ((action: ActionStateChanged, state: any) => void), 
        runHueEventEffects?: ((action: ActionHueEvent, state: any) => void)
    ){
        this.name = name;
        this.stateMap = stateMap;
        this.runHueEventEffects = runHueEventEffects;
        this.runStateChangedEffects = runStateChangedEffects;
    }

    compare = (state: State): number => {
        let matchedStates = 0;
        for (const check of this.stateMap) {
            if(!state[check.key]){
                return matchedStates;
            }

            const stateValue = state[check.key];

            switch(check.compariator){
                case 'eq':
                    if(stateValue === check.value){
                        matchedStates = matchedStates + (check.pointBuff || 1);
                    }
                case 'neq':
                    if(stateValue === check.value){
                        matchedStates = matchedStates + (check.pointBuff || 1);
                    }
                case 'lt':
                    if(Number(stateValue) < Number(check.value)){
                        matchedStates = matchedStates + (check.pointBuff || 1);
                    }
                case 'gt':
                    if(Number(stateValue) > Number(check.value)){
                        matchedStates = matchedStates + (check.pointBuff || 1);
                    }
            }

        }
        return matchedStates;
    }
}

interface IValueCheck {
    key: string;
    value: any;
    compariator: 'eq' | 'gt' | 'lt' | 'neq';
    pointBuff?: number;
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


const profiles: Profile[] = [
    new Profile('kyle-only', [
        {
            key: Sensor.names.people.kyle.home,
            value: 'home',
            compariator: 'eq',
        },
        {
            key: Sensor.names.people.molly.home,
            value: 'away',
            compariator: 'eq',
        },
    ]),
    new Profile('both-home', [
        {
            key: Sensor.names.people.kyle.home,
            value: 'home',
            compariator: 'eq',
        },
        {
            key: Sensor.names.people.molly.home,
            value: 'home',
            compariator: 'eq',
        },
    ],
    (action, state) => {
        if(action.payload.entity_id === Sensor.names.motion.livingroom){
            const lightUpdate: ILightTempSetting = {
                brightness_pct: 0,
                color_temp: 100,
                entity_id: Sensor.names.light.livingroom,
                rate: 2,
                topic: Sensor.names.light.livingroom,
                state: 'turn_off'
            }
            if(state[action.payload.entity_id] === true){
                lightUpdate.brightness_pct = 100;
                lightUpdate.state = 'turn_on';
            }
            messagesToFire.push(lightUpdate);
        }
    })
]

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

const getProfileThatIsMostLikely = (state: State): null | Profile => {
    let highestMatchCount = 0;
    let result = null;
    for (const profile of profiles) {
        const matchCount = profile.compare(state);
        if(matchCount > highestMatchCount){
            highestMatchCount = matchCount;
            result = profile;
        }
    }
    return result;
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
    const profile = getProfileThatIsMostLikely(state);
    let newState;
    switch(action.action){
        case 'state_changed':
            newState = handleStateCanged(action, state);
            if(profile?.runStateChangedEffects){
                profile?.runStateChangedEffects(action, newState);
            }
            return newState;

        case 'hue_event':
            newState = handleHueEvent(action, state);
            if(profile?.runHueEventEffects){
                profile?.runHueEventEffects(action, newState);
            }
            return newState;

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

//@ts-expect-error call main method with message
translateToDispatch(msg);

if(messagesToFire){
    //@ts-expect-error return messages from node
    return [messagesToFire];
}