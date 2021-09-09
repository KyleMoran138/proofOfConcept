const stateKeys = {
    dimmer: {
        office: 'hue_dimmer_switch_1',
        bedroom: 'hue_dimmer_switch_3',
        kitchen: 'hue_dimmer_switch_4',
        bathroom: 'hue_dimmer_switch_2',
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
            location: 'device_tracker.kyles_phone',
            phoneCharging: 'binary_sensor.kyles_phone_is_charging',
            sleepConfidence: 'sensor.pixel_3_sleep_confidence'
        },
        molly: {
            location: 'device_tracker.molly_s_phone',
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
    },
}

const stateKeyVals = {
    motionEnabled: 'motionEnabled',
    true: 'true',
    logMute: 'logMute',
    sleepMode: 'sleepMode',
}

const TIME = {
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000,
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
    sleepConfidenceThreshold: 80,
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

class Profile {
    name: string = ""
    stateMap: IValueCheck[] = [];
    priority: number;
    init: () => void
    doStack: boolean;

    constructor(
        name: string,
        priority = 0,
        stateMap: IValueCheck[],
        init: (() => void),
        doStack?: boolean,
    ){
        this.name = name;
        this.stateMap = stateMap;
        this.priority = priority;
        this.doStack = doStack || false;
        this.init = init;
    }

    getMatchingProfileValues = (): number => {
        let matchedStates = 0
        for (const check of this.stateMap) {
            matchedStates = matchedStates + (this.checkValue(check) ? 1 : 0);
        }
        return matchedStates;
    }

    checkValue = (check: IValueCheck): boolean => {

        if(!check.compare(getState()[check.key])){
            return false;
        }

        if(check.subCheck){
            for (const subCheck of check.subCheck) {
                if(!this.checkValue(subCheck)){
                    return false;
                }
            }
        }

        return true;
    }

    checkStates = (): void | Partial<State> => {
        let finalCheckState = {};

        for (const motionSensor of Object.values(MotionSensors)) {
            finalCheckState = {...finalCheckState, ...motionSensor.checkState()};
        }

        for (const remote of Object.values(Remotes)) {
            finalCheckState = {...finalCheckState, ...remote.checkState()};
        }

        return finalCheckState;
    }
}

class MotionSensor {
    name: string;

    motionStarted?: () => void | Partial<State>;
    motionStopped?: () => void | Partial<State>;

    constructor(name: string, events?: {motionStarted?: () => void | Partial<State>, motionStopped: () => void | Partial<State>}){
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
                return motionState();
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

interface _IHueDimmerEvents {
    onPressed?: () => void;
    onRelease?: () => void;
    onLongRelease?: (holdTime?: number) => void;

    upPressed?: () => void;
    upRelease?: () =>   void;
    upLongRelease?: (holdTime?: number) => void;

    downPressed?: () => void;
    downRelease?: () => void;
    downLongRelease?: (holdTime?: number) => void;

    offPressed?: () => void;
    offRelease?: () => void;
    offLongRelease?: (holdTime?: number) => void;
}

class HueRemote implements _IHueDimmerEvents {
    name: string;
    onPressed?: () => void | Partial<State>;
    onRelease?: () => void | Partial<State>;
    onLongRelease?: (holdTime?: number) => void | Partial<State>;

    upPressed?: () => void | Partial<State>;
    upRelease?: () => void | Partial<State>;
    upLongRelease?: (holdTime?: number) => void | Partial<State>;

    downPressed?: () => void | Partial<State>;
    downRelease?: () => void | Partial<State>;
    downLongRelease?: (holdTime?: number) => void | Partial<State>;

    offPressed?: () => void | Partial<State>;
    offRelease?: () => void | Partial<State>;
    offLongRelease?: (holdTime?: number) => void | Partial<State>;

    constructor(name: string, eventActions?: _IHueDimmerEvents){
        this.name = name;

        this.onPressed = eventActions?.onPressed;
        this.onRelease = eventActions?.onRelease;
        this.onLongRelease = eventActions?.onLongRelease;

        this.upPressed = eventActions?.upPressed;
        this.upRelease = eventActions?.upRelease;
        this.upLongRelease = eventActions?.upLongRelease;

        this.downPressed = eventActions?.downPressed;
        this.downRelease = eventActions?.downRelease;
        this.downLongRelease = eventActions?.downLongRelease;

        this.offPressed = eventActions?.offPressed;
        this.offRelease = eventActions?.offRelease;
        this.offLongRelease = eventActions?.offLongRelease;
    }

    checkState = () => {
        const action = (currentAction as ActionHueEvent);
        if(action.action !== 'hue_event'){
            return;
        }

        if(action.payload.id === `${this.name}`){
            switch(action.payload.event as HueEvent){
                case HueEvent.ON_PRESS:
                    if(this.onPressed){
                        return this.onPressed()
                    }
                    break;
                case HueEvent.ON_RELEASE:
                    if(this.onRelease){
                        return this.onRelease()
                    }
                    break;
                case HueEvent.ON_LONG_RELEASE:
                    if(this.onLongRelease){
                        return this.onLongRelease(this.holdTime);
                    }
                    break;
                case HueEvent.UP_PRESS:
                    if(this.upPressed){
                        return this.upPressed()
                    }
                    break;
                case HueEvent.UP_RELEASE:
                    if(this.upRelease){
                        return this.upRelease()
                    }
                    break;
                case HueEvent.UP_LONG_RELEASE:
                    if(this.upLongRelease){
                        return this.upLongRelease(this.holdTime)
                    }
                    break;
                case HueEvent.DOWN_PRESS:
                    if(this.downPressed){
                        return this.downPressed();
                    }
                    break;
                case HueEvent.DOWN_RELEASE:
                    if(this.downRelease){
                        return this.downRelease();
                    }
                    break;
                case HueEvent.DOWN_LONG_RELEASE:
                    if(this.downLongRelease){
                        return this.downLongRelease(this.holdTime)
                    }
                    break;
                case HueEvent.OFF_PRESS:
                    if(this.offPressed){
                        return this.offPressed()
                    }
                    break;
                case HueEvent.OFF_RELEASE:
                    if(this.offRelease){
                        return this.offRelease()
                    }
                    break;
                case HueEvent.OFF_LONG_RELEASE:
                    if(this.offLongRelease){
                        return this.offLongRelease(this.holdTime)
                    }
                    break;
            }
        }

    }

    public get holdTime(): number{
       return getState()[`${this.name}-count`] || 0;
    }
}

interface IValueCheck {
    key: string;
    compare: (stateValue: State) => boolean;
    subCheck?: IValueCheck[]
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
const profiles: Profile[] = []
const MotionSensors = {
    kitchen: new MotionSensor(stateKeys.motion.kitchen),
    office: new MotionSensor(stateKeys.motion.office),
    bathroom: new MotionSensor(stateKeys.motion.bathroom),
    bedroom: new MotionSensor(stateKeys.motion.bedroom),
    livingroom: new MotionSensor(stateKeys.motion.livingroom),
}
const Remotes = {
    office: new HueRemote(stateKeys.dimmer.office),
    bedroom: new HueRemote(stateKeys.dimmer.bedroom),
    kitchen: new HueRemote(stateKeys.dimmer.kitchen),
    bathroom: new HueRemote(stateKeys.dimmer.bathroom),
}

// Helpers

const getState = (): State => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.get("state") || {true: true}
}

const setState = (state: State) => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.set("state", state)
}

const log = (...msg: any) => {
    const state = getState();
    if(state[stateKeyVals.logMute]){
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

const getProfileThatIsMostLikely = (): null | Profile => {
    let greatestProfileMatchCoung = 0;
    let result = null;

    for (const profile of profiles) {
        const matchCount = profile.getMatchingProfileValues();
        const matchCountGreater = matchCount > greatestProfileMatchCoung;
        const matchCountEqualToOrGreatest = matchCount >= greatestProfileMatchCoung;
        const profilePriorityGreater = profile.priority > (result ? result.priority : -1)

        if((matchCountGreater && !profile.doStack) || (profilePriorityGreater && matchCountEqualToOrGreatest && !profile.doStack)){
            greatestProfileMatchCoung = matchCount;
            result = profile;
        }
    }

    return result;
}

const getStackedProfiles = (): Profile[] => {
    let stackedProfiles: Profile[] = [];
    for (const profile of profiles) {
        const matchCount = profile.getMatchingProfileValues();
        if(matchCount > 0 && profile.doStack){
            stackedProfiles.push(profile);
        }
    }
    return stackedProfiles;
}

const fireLightOnAction = (settings: {lightId: string, brightness_pct?: number, color_temp?: number, rgb_color?: [number, number, number], delayMs?: number} ) => {
    if(settings.color_temp || (!settings.color_temp && !settings.rgb_color)){
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            color_temp: settings.color_temp || DEFAULT.warmth,
            entity_id: settings.lightId,
            topic: settings.lightId,
            rate: DEFAULT.delay,
            state: 'turn_on',
        } as ILightTempSetting)
    }

    if(settings.rgb_color){
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            rgb_color: settings.rgb_color,
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

const checkProfileStates = (profiles: Profile[]) => {
    let state = {}
    profiles.forEach(profile => {
        state = {...state, ...profile.checkStates()};
    });
    return state;
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
    const mainProfile = getProfileThatIsMostLikely();
    const stackProfiles = getStackedProfiles();

    mainProfile?.init();
    stackProfiles.forEach(profile => {
        profile.init();
    })

    log(mainProfile?.name, (mainProfile?.checkStates() || [])[`${stateKeyVals.motionEnabled}`])

    let newState;
    switch(action.action){
        case 'state_changed':
            newState = handleStateCanged(action, state);
            newState = {...newState, ...checkProfileStates(stackProfiles), ...mainProfile?.checkStates()};
            return newState;

        case 'hue_event':
            newState = handleHueEvent(action, state);
            newState = {...newState, ...checkProfileStates(stackProfiles), ...mainProfile?.checkStates()};
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

    if (includesAny(['_level', '_temperature', '_confidence'], action.payload.entity_id)) {
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
                [`${countKey}`]: 2
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


const defaultMotionActionSetup = (lightOffDelayMs?: number, brightness_pct?: number) => {
    MotionSensors.kitchen.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.kitchen,
            brightness_pct: brightness_pct || 100,
        });
    }
    MotionSensors.bathroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.bathroom,
            brightness_pct: brightness_pct || 100,
        });
    }
    MotionSensors.livingroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.livingroom,
            brightness_pct: brightness_pct || 100,
        });
    }
    MotionSensors.bedroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.bedroom,
            brightness_pct: brightness_pct || 100,
        });
    }

    if(lightOffDelayMs){
        MotionSensors.kitchen.motionStopped = () => {
            fireLightOffAction(stateKeys.light.kitchen, lightOffDelayMs)
        }
        MotionSensors.bathroom.motionStopped = () => {
            fireLightOffAction(stateKeys.light.bathroom, (5 * TIME.minute)) // BATHROOM DELAY always the same
        }
        MotionSensors.livingroom.motionStopped = () => {
            fireLightOffAction(stateKeys.light.livingroom, lightOffDelayMs)
        }
        MotionSensors.bedroom.motionStopped = () => {
            fireLightOffAction(stateKeys.light.bedroom, lightOffDelayMs)
        }
    }
}

const motionDisabledActionSetup = () => {
    MotionSensors.kitchen.motionStarted = () => {
    }
    MotionSensors.bathroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.bathroom,
            brightness_pct: 100,
        });
    }
    MotionSensors.livingroom.motionStarted = () => {
    }
    MotionSensors.bedroom.motionStarted = () => {
    }

    MotionSensors.kitchen.motionStopped = () => {
    }
    MotionSensors.bathroom.motionStopped = () => {
        fireLightOffAction(stateKeys.light.bathroom, (5 * 60000)) // BATHROOM DELAY always the same
    }
    MotionSensors.livingroom.motionStopped = () => {
    }
    MotionSensors.bedroom.motionStopped = () => {
    }
}

const defaultRemoteActionSetup = () => {
    const disableMotion = (holdLength?: number) => {
        if(holdLength && holdLength < 2){
            return;
        }
        return {
            [`${stateKeyVals.motionEnabled}`]: false
        }
    }
    const enableMotion = (holdLength?: number) => {
        if(holdLength && holdLength < 2){
            return;
        }
        return {
            [`${stateKeyVals.motionEnabled}`]: true
        }
    }

    Remotes.office.upLongRelease = (holdLength?: number) => {
        if(holdLength && holdLength >= 7){
            return {[`${stateKeyVals.logMute}`]: false};
        }
        return enableMotion(holdLength);
    }
    Remotes.bedroom.upLongRelease = enableMotion;
    Remotes.kitchen.upLongRelease = enableMotion;
    Remotes.bathroom.upLongRelease = enableMotion;

    Remotes.office.downLongRelease = (holdLength?: number) => {
        if(holdLength && holdLength >= 7){
            return {[`${stateKeyVals.logMute}`]: true};
        }
        return disableMotion(holdLength);
    }
    Remotes.bedroom.downLongRelease = disableMotion;
    Remotes.kitchen.downLongRelease = disableMotion;
    Remotes.bathroom.downLongRelease = disableMotion;
}

// Profiles

profiles.push(
    new Profile(
        'defaultActions',
        0,
        [
            {
                key: stateKeyVals.true,
                compare: () => true,
            },
        ],
        () => {
            defaultRemoteActionSetup();
        },
        true
    ),
    new Profile(
        'kyle-only',
        0,
        [
            {
                key: stateKeys.people.kyle.location,
                compare: (location: string) => location === 'home',
                subCheck: [
                    {
                        key: stateKeys.people.molly.location,
                        compare: (location: string) => !(location === 'home')
                    },
                ]
            },
        ],
        () => {
            defaultMotionActionSetup(10 * TIME.second)

            Remotes.office.onPressed = () => {
                fireLightOnAction({
                    lightId: stateKeys.light.office,
                    brightness_pct: 100,
                    color_temp: DEFAULT.warmth,
                })
            }

            Remotes.office.offPressed = () => {
                fireLightOffAction(stateKeys.light.office, 0);
            }
        }
    ),
    new Profile(
        'both-home-or-just-molly',
        1,
        [
            {
                key: stateKeys.people.kyle.location,
                compare: (location: string) => location === 'home',
                subCheck: [
                    {
                        key: stateKeys.people.molly.location,
                        compare: (location: string) => location === 'home'
                    },
                ]
            },
            {
                key: stateKeys.people.molly.location,
                compare: (location: string) => location === 'home',
            }
        ],
        () => {
            defaultMotionActionSetup(TIME.minute * 30);
        }
    ),
    new Profile(
        'someone-sleepy',
        -1,
        [
            {
                key: stateKeys.people.kyle.location,
                compare: (location: string) => location === 'home',
                subCheck: [
                    {
                        key: stateKeys.people.molly.location,
                        compare: (location: string) => !(location === 'home')
                    },
                    {
                        key: stateKeys.people.kyle.phoneCharging,
                        compare: (charging: boolean) => charging
                    },
                    {
                        key: stateKeys.people.kyle.sleepConfidence,
                        compare: (sleepConfidence: number) => sleepConfidence > DEFAULT.sleepConfidenceThreshold
                    },
                ]
            },
            {
                key: stateKeys.people.molly.location,
                compare: (location: string) => location === 'home',
                subCheck: [
                    {
                        key: stateKeys.people.kyle.location,
                        compare: (location: string) => !(location === 'home')
                    },
                    {
                        key: stateKeys.people.molly.phoneCharging,
                        compare: (charging: boolean) => charging
                    },
                    {
                        key: stateKeys.people.molly.sleepConfidence,
                        compare: (sleepConfidence: number) => sleepConfidence > DEFAULT.sleepConfidenceThreshold
                    },
                ]
            },
            {
                key: stateKeys.people.molly.location,
                compare: (location: string) => location === 'home',
                subCheck: [
                    {
                        key: stateKeys.people.kyle.location,
                        compare: (location: string) => location === 'home'
                    },
                    {
                        key: stateKeys.people.molly.phoneCharging,
                        compare: (charging: boolean) => charging
                    },
                    {
                        key: stateKeys.people.kyle.phoneCharging,
                        compare: (charging: boolean) => charging
                    },
                    {
                        key: stateKeys.people.molly.sleepConfidence,
                        compare: (sleepConfidence: number) => sleepConfidence > DEFAULT.sleepConfidenceThreshold
                    },
                    {
                        key: stateKeys.people.kyle.sleepConfidence,
                        compare: (sleepConfidence: number) => sleepConfidence > DEFAULT.sleepConfidenceThreshold
                    },
                ]
            },
        ],
        () => {
            defaultMotionActionSetup(TIME.minute * 2, 20);
            MotionSensors.bedroom.motionStarted = () => {}
            MotionSensors.bedroom.motionStopped = () => {}
        },
        true,
    ),
    new Profile(
        'motion-disabled',
        -1,
        [
            {
                key: stateKeyVals.motionEnabled,
                compare: (motionEnabled: boolean) => !motionEnabled
            }
        ],
        () => {
            motionDisabledActionSetup();
        },
        true,
    )

)

//@ts-expect-error call main method with message
translateToDispatch(msg);

if(messagesToFire){
    //@ts-expect-error return messages from node
    return [messagesToFire];
}