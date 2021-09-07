const DeviceIds = {
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
        livingroom: 'binary_sensor.living_room',
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

const DEFAULT = {
    brightness: 100,
    warmth: 200,
    color: {
        red: [255, 0, 0],
        green: [0, 255, 0],
        blue: [0, 0, 255],
    },
    delay: 0,
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

class MotionSensor {
    name: string;

    motionStarted?: () => void;
    motionStopped?: () => void;

    constructor(name: string, events?: {motionStarted?: () => void, motionStopped: () => void}){
        this.name = name;

        if(!events){
            return;
        }

        if(events.motionStarted){
            this.motionStarted = events.motionStarted;
        }

        if(events.motionStopped){
            this.motionStopped = events.motionStopped;
        }
    }

    checkState = () => {
        const action = (currentAction as ActionStateChanged);
        if(action.action !== 'state_changed'){
            return;
        }

        if(action.payload.entity_id === `${this.name}_motion`){
            const motionState = this.motion === false ? this.motionStarted : this.motionStopped;
            if(motionState){
                motionState();
            }
        }

    }

    public get temp(): number{
       return getState()[`${this.name}_temperature`] || -1;
    }

    public get light(): number{
        return getState()[`${this.name}_light_level`] || -1;
    }

    public get motion(): boolean {
        return getState()[`${this.name}_motion`] || false;
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

interface _ILightTempData {
    entity_id: string,
    state: "turn_on" | "turn_off" | 'toggle',
    brightness_pct: number,
    color_temp: number // can't remember the range rn
}

interface _ILightColorData {
    entity_id: string,
    state: "turn_on" | "turn_off" | 'toggle',
    brightness_pct: number,
    rgb_color: [number, number, number],
}

interface ILightTempSetting extends IDelay, _ILightTempData {}
interface ILightColorSetting extends IDelay, _ILightColorData {}
interface ILightOffSetting extends IDelay {
    entity_id: string,
    state: 'turn_off',
}

type State = any;

type ActionStateChanged = {action: 'state_changed', payload: StateChange};
type ActionHueEvent = {action: 'hue_event', payload: IHueEvent};

type Action =
    ActionStateChanged |
    ActionHueEvent;

const messagesToFire: IDelay[] = [];
let currentAction: Action;


const profiles: Profile[] = [
    new Profile(
        'kyle-only',
        [
            {
                key: DeviceIds.people.kyle.home,
                value: 'home',
                compariator: 'eq',
            },
            {
                key: DeviceIds.people.molly.home,
                value: 'away',
                compariator: 'eq',
            },
        ],
        () => {
            const MotionSensors = {
                kitchen: new MotionSensor(DeviceIds.motion.kitchen),
                office: new MotionSensor(DeviceIds.motion.office),
            }

            MotionSensors.office.motionStarted = () => {
                fireLightOnAction({
                    lightId: DeviceIds.light.kitchen,
                    brightness_pct: 100,
                    rgb_color: [255, 255, 0],
                });
            }

            MotionSensors.office.motionStopped = () => {
                fireLightOffAction(DeviceIds.light.kitchen, 10000)
            }

            for (const motionSensor of Object.values(MotionSensors)) {
                motionSensor.checkState();
            }
        }
    ),
    new Profile(
        'both-home-and-awake',
        [
            {
                key: DeviceIds.people.kyle.home,
                value: 'home',
                compariator: 'eq',
            },
            {
                key: DeviceIds.people.molly.home,
                value: 'away',
                compariator: 'eq',
            },
            {
                key: DeviceIds.people.kyle.sleepConfidence,
                value: 70,
                compariator: 'lt',
            },
            {
                key: DeviceIds.people.molly.sleepConfidence,
                value: 70,
                compariator: 'lt',
            },
        ],
        () => {
            const MotionSensors = {
                kitchen: new MotionSensor(DeviceIds.motion.kitchen),
                office: new MotionSensor(DeviceIds.motion.office),
            }

            MotionSensors.office.motionStarted = () => {
                fireLightOnAction({
                    lightId: DeviceIds.light.kitchen,
                    brightness_pct: 100,
                    rgb_color: [255, 255, 0],
                });
            }

            MotionSensors.office.motionStopped = () => {
                fireLightOffAction(DeviceIds.light.kitchen, 10000)
            }

            for (const motionSensor of Object.values(MotionSensors)) {
                motionSensor.checkState();
            }
        }
    ),
    (action, state) => {
        if(action.payload.entity_id === DeviceIds.motion.livingroom){
            if(state[action.payload.entity_id] === true){
                const lightUpdate: ILightTempSetting = {
                    brightness_pct: 100,
                    color_temp: 100,
                    entity_id: DeviceIds.light.livingroom,
                    rate: 2,
                    topic: DeviceIds.light.livingroom,
                    state: 'turn_on'
                }
                messagesToFire.push(lightUpdate);
            }else{
                messagesToFire.push({
                    rate: 10,
                    entity_id: DeviceIds.light.kitchen,
                    state: 'turn_off',
                    topic: DeviceIds.light.kitchen
                } as ILightOffSetting)
            }
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

const fireLightOnAction = (settings: {lightId: string, brightness_pct?: number, color_temp?: number, rgb_color?: [number, number, number], delayMs?: number} ) => {
    if(settings.color_temp){
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            color_temp: settings.color_temp || DEFAULT.color,
            entity_id: settings.lightId,
            topic: settings.lightId,
            rate: DEFAULT.delay,
            state: 'turn_on',
        } as ILightTempSetting)
    }

    if(settings.rgb_color){
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            rgb_color: settings.rgb_color || DEFAULT.color.red,
            entity_id: settings.lightId,
            topic: settings.lightId,
            rate: DEFAULT.delay,
            state: 'turn_on',
        } as ILightColorSetting)
    }
}

const fireLightOffAction = (lightId: string, delayMs?: number) => {
    messagesToFire.push({
        entity_id: lightId,
        topic: lightId,
        rate: delayMs || DEFAULT.delay,
        state: 'turn_off',
    } as ILightOffSetting)

}

const fireLightAction = (settings: {
    lightId: string,
    brightness_pct?: number,
    color_temp?: number,
    rgb_color?: [number, number, number],
    delayMs?: number,
    turnOffDelayMs?: number
}) => {
    fireLightOnAction({...settings});
    if(settings.turnOffDelayMs && settings.turnOffDelayMs > 1){
        fireLightOffAction(settings.lightId, settings.turnOffDelayMs);
    }
}


// Controller

const translateToDispatch = (msg: RootMessage<unknown>) => {

    if(!msg || !msg.payload || !msg.payload.event_type){
        return;
    }

    if(msg.payload.event_type === 'state_changed' ){
        const actionData = (msg as RootMessage<RootStateChange<StateChange>>).payload.event;
        if(actionData && actionData.new_state){
            currentAction = {action: msg.payload.event_type, payload: actionData.new_state};
            doDispatch(currentAction)
            return;
        }
    }

    if(msg.payload.event_type === 'hue_event'){
        const actionData = (msg as RootMessage<IHueEvent>).payload.event;
        if(actionData){
            currentAction = {action: msg.payload.event_type, payload: actionData};
            doDispatch(currentAction)
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

    if (action.payload.entity_id.includes('_light_level')) {
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