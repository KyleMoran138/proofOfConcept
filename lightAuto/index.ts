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

interface IValueCheck {
    compare: (state: State) => boolean;
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
            matchedStates = matchedStates + (check.compare(getState()) ? 1 : 0);
        }
        return matchedStates;
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

class Person {
    name: string;

    constructor(name: string){
        this.name = name;
    }

    public get location(): string |undefined {
        return getState()[`device_tracker.${this.name}`] || undefined;
    }

    public get home(): boolean {
        return this.location === 'home';
    }

    public get phoneCharging(): boolean | undefined {
        return getState()[`binary_sensor.${this.name}_is_charging`] || undefined;
    }

    public get sleepConfidence(): number | undefined {
        return getState()[`sensor.${this.name}_sleep_confidence`] || undefined;
    }

}

class Light {
    id: string;

    constructor(id: string){
        this.id = id;
    }

    public get on(): boolean | undefined {
        return (getState()[`${this.id}`] === "on") || undefined;
    }
}

class Switch {
    id: string;

    constructor(id: string){
        this.id = id;
    }

    public get enabled(): boolean {
        return (getState()[`${this.id}`] == true) || false;
    }

    set = (state: any) => {
        return {[`${this.id}`]:state};
    }
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
    bathroom: new MotionSensor('binary_sensor.bathroom_motion'),
    bedroom: new MotionSensor('binary_sensor.bedroom_motion'),
    kitchen: new MotionSensor('binary_sensor.kitchen_motion'),
    livingroom: new MotionSensor('binary_sensor.living_room'),
    office: new MotionSensor('binary_sensor.motion05'),
}
const Remotes = {
    bathroom: new HueRemote('hue_dimmer_switch_2'),
    bedroom: new HueRemote('hue_dimmer_switch_3'),
    kitchen: new HueRemote('hue_dimmer_switch_4'),
    office: new HueRemote('hue_dimmer_switch_1'),
}
const People = {
    kyle: new Person('kyles_phone'),
    molly: new Person('molly_s_phone'),
}
const Lights = {
    bathroom: new Light('light.bathroom_lights'),
    bedroom: new Light('light.bedroom_lights'),
    kitchen: new Light('light.kitchen_lights'),
    livingroom: new Light('light.livingroom_lights'),
    office: new Light('light.office_lights'),
}
const Switches = {
    motion: {
        enabled: new Switch('motionEnabled'),
        bedroomDisabled: new Switch('motionDisabled.bedroom'),
        livingroomDisabled: new Switch('motionDisabled.livingroom'),
        officeDisabled: new Switch('motionDisabled.office'),
        kitchenDisabled: new Switch('motionDisabled.kitchen'),
        bathroomDisabled: new Switch('motionDisabled.bathroom'),
    },
    logMute: new Switch('logMute'),
    sleepMode: new Switch('sleepMode'),
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
    if(Switches.logMute.enabled){
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

const getStateValue = (key: string) => {
    return getState()[`${key}`]
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

    log(mainProfile?.name)

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


const defaultMotionActionSetup = (lightOffDelayMs?: number, brightness_pct?: number, roomDelayMs?: {bedroom: number, kitchen: number, livingroom: number, bathroom: number}) => {
    MotionSensors.kitchen.motionStarted = () => {
        fireLightOnAction({
            lightId: Lights.kitchen.id,
            brightness_pct: brightness_pct || 100,
        });
    }
    MotionSensors.bathroom.motionStarted = () => {
        fireLightOnAction({
            lightId: Lights.bathroom.id,
            brightness_pct: brightness_pct || 100,
        });
    }
    MotionSensors.livingroom.motionStarted = () => {
        fireLightOnAction({
            lightId: Lights.livingroom.id,
            brightness_pct: brightness_pct || 100,
        });
    }
    MotionSensors.bedroom.motionStarted = () => {
        fireLightOnAction({
            lightId: Lights.bedroom.id,
            brightness_pct: brightness_pct || 100,
        });
    }

    if(lightOffDelayMs){
        MotionSensors.kitchen.motionStopped = () => {
            fireLightOffAction(Lights.kitchen.id, roomDelayMs?.kitchen || lightOffDelayMs)
        }
        MotionSensors.bathroom.motionStopped = () => {
            fireLightOffAction(Lights.bathroom.id, roomDelayMs?.bathroom || (5 * TIME.minute)) // BATHROOM DELAY always the same
        }
        MotionSensors.livingroom.motionStopped = () => {
            fireLightOffAction(Lights.livingroom.id, roomDelayMs?.livingroom || lightOffDelayMs)
        }
        MotionSensors.bedroom.motionStopped = () => {
            fireLightOffAction(Lights.bedroom.id, roomDelayMs?.bedroom || lightOffDelayMs)
        }
    }
}

const motionDisabledActionSetup = () => {
    MotionSensors.kitchen.motionStarted = () => {
    }
    MotionSensors.bathroom.motionStarted = () => {
        fireLightOnAction({
            lightId: Lights.bathroom.id,
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
        fireLightOffAction(Lights.bathroom.id, (5 * TIME.minute)) // BATHROOM DELAY always the same
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
            ...Switches.motion.enabled.set(false)
        }
    }
    const enableMotion = (holdLength?: number) => {
        if(holdLength && holdLength < 2){
            return;
        }
        return {
            ...Switches.motion.enabled.set(true),
            ...Switches.motion.bedroomDisabled.set(false),
            ...Switches.motion.bedroomDisabled.set(false),
            ...Switches.motion.kitchenDisabled.set(false),
            ...Switches.motion.livingroomDisabled.set(false),
            ...Switches.motion.officeDisabled.set(false),
        }
    }

    Remotes.office.upLongRelease = (holdLength?: number) => {
        if(holdLength && holdLength >= 7){
            return {...Switches.logMute.set(false)};
        }
        return enableMotion(holdLength);
    }
    Remotes.office.downLongRelease = (holdLength?: number) => {
        if(holdLength && holdLength >= 7){
            return {...Switches.logMute.set(true)};
        }
        return disableMotion(holdLength);
    }

    Remotes.bathroom.offPressed = () => {

        fireLightOnAction({lightId: Lights.bathroom.id})

        return Switches.motion.bathroomDisabled.set(true)
    }

    Remotes.bedroom.upLongRelease = enableMotion;
    Remotes.kitchen.upLongRelease = enableMotion;
    Remotes.bathroom.upLongRelease = enableMotion;

    Remotes.bedroom.downLongRelease = disableMotion;
    Remotes.kitchen.downLongRelease = disableMotion;
    Remotes.bathroom.downLongRelease = disableMotion;

    Remotes.office.onPressed =() => fireLightOnAction({lightId: Lights.office.id});
    Remotes.bedroom.onPressed =() => fireLightOnAction({lightId: Lights.bedroom.id});
    Remotes.kitchen.onPressed =() => fireLightOnAction({lightId: Lights.kitchen.id});
    Remotes.bathroom.onPressed =() => fireLightOnAction({lightId: Lights.bathroom.id});

    Remotes.office.offPressed = () => fireLightOffAction(Lights.office.id);
    Remotes.bedroom.offPressed = () => fireLightOffAction(Lights.bedroom.id);
    Remotes.kitchen.offPressed = () => fireLightOffAction(Lights.kitchen.id);

}

// Profiles

profiles.push(
    new Profile(
        'defaultActions',
        0,
        [
            {
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
                compare: () => {
                    if(People.kyle.home){
                        return !People.molly.home;
                    }
                    return false;
                },
            },
        ],
        () => {
            defaultMotionActionSetup(30 * TIME.second);
            defaultRemoteActionSetup();
        }
    ),
    new Profile(
        'molly-home',
        1,
        [
            {
                compare: () => People.molly.home,
            },
        ],
        () => {
            defaultMotionActionSetup((TIME.minute * 30));
        }
    ),
    new Profile(
        'someone-sleepy',
        -1,
        [
            {
                compare: () => false,
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
                compare: () => {
                    if(!Switches.motion.enabled){
                        return true;
                    }

                    const roomsMotionStatus = [
                        Switches.motion.bathroomDisabled.enabled,
                        Switches.motion.bedroomDisabled.enabled,
                        Switches.motion.kitchenDisabled.enabled,
                        Switches.motion.livingroomDisabled.enabled,
                        Switches.motion.officeDisabled.enabled,
                    ]

                    for (const roomDisabled of roomsMotionStatus) {
                        if(roomDisabled){
                            return true;
                        }
                    }

                    return false;
                }
            }
        ],
        () => {
            if(!Switches.motion.enabled.enabled){
                motionDisabledActionSetup();
            }

            if(Switches.motion.bathroomDisabled.enabled){
                MotionSensors.bathroom.motionStarted = () => {};
                MotionSensors.bathroom.motionStopped = () => {};
            }

            if(Switches.motion.bedroomDisabled.enabled){
                MotionSensors.bedroom.motionStarted = () => {};
                MotionSensors.bedroom.motionStopped = () => {};
            }

            if(Switches.motion.kitchenDisabled.enabled){
                MotionSensors.kitchen.motionStarted = () => {};
                MotionSensors.kitchen.motionStopped = () => {};
            }

            if(Switches.motion.livingroomDisabled.enabled){
                MotionSensors.livingroom.motionStarted = () => {};
                MotionSensors.livingroom.motionStopped = () => {};
            }

            if(Switches.motion.officeDisabled.enabled){
                MotionSensors.office.motionStarted = () => {};
                MotionSensors.office.motionStopped = () => {};
            }
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