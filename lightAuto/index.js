"use strict";
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
        bathroom: 'light.bathroom_lights',
        bedroom: 'light.bedroom_lights',
        kitchen: 'light.kitchen_lights',
        livingroom: 'light.livingroom_lights',
        office: 'light.office_lights',
    },
};
const stateKeyVals = {
    motionEnabled: 'motionEnabled',
    true: 'true',
    logMute: 'logMute',
    sleepMode: 'sleepMode',
};
const TIME = {
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000,
};
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
};
var HueEvent;
(function (HueEvent) {
    HueEvent[HueEvent["ON_PRESS"] = 1000] = "ON_PRESS";
    HueEvent[HueEvent["ON_HOLD"] = 1001] = "ON_HOLD";
    HueEvent[HueEvent["ON_RELEASE"] = 1002] = "ON_RELEASE";
    HueEvent[HueEvent["ON_LONG_RELEASE"] = 1003] = "ON_LONG_RELEASE";
    HueEvent[HueEvent["UP_PRESS"] = 2000] = "UP_PRESS";
    HueEvent[HueEvent["UP_HOLD"] = 2001] = "UP_HOLD";
    HueEvent[HueEvent["UP_RELEASE"] = 2002] = "UP_RELEASE";
    HueEvent[HueEvent["UP_LONG_RELEASE"] = 2003] = "UP_LONG_RELEASE";
    HueEvent[HueEvent["DOWN_PRESS"] = 3000] = "DOWN_PRESS";
    HueEvent[HueEvent["DOWN_HOLD"] = 3001] = "DOWN_HOLD";
    HueEvent[HueEvent["DOWN_RELEASE"] = 3002] = "DOWN_RELEASE";
    HueEvent[HueEvent["DOWN_LONG_RELEASE"] = 3003] = "DOWN_LONG_RELEASE";
    HueEvent[HueEvent["OFF_PRESS"] = 4000] = "OFF_PRESS";
    HueEvent[HueEvent["OFF_HOLD"] = 4001] = "OFF_HOLD";
    HueEvent[HueEvent["OFF_RELEASE"] = 4002] = "OFF_RELEASE";
    HueEvent[HueEvent["OFF_LONG_RELEASE"] = 4003] = "OFF_LONG_RELEASE";
})(HueEvent || (HueEvent = {}));
class Profile {
    constructor(name, priority = 0, stateMap, init, doStack) {
        this.name = "";
        this.stateMap = [];
        this.getMatchingProfileValues = () => {
            let matchedStates = 0;
            for (const check of this.stateMap) {
                matchedStates = matchedStates + (check.compare(getState()) ? 1 : 0);
            }
            return matchedStates;
        };
        this.checkStates = () => {
            let finalCheckState = {};
            for (const motionSensor of Object.values(MotionSensors)) {
                finalCheckState = { ...finalCheckState, ...motionSensor.checkState() };
            }
            for (const remote of Object.values(Remotes)) {
                finalCheckState = { ...finalCheckState, ...remote.checkState() };
            }
            return finalCheckState;
        };
        this.name = name;
        this.stateMap = stateMap;
        this.priority = priority;
        this.doStack = doStack || false;
        this.init = init;
    }
}
class MotionSensor {
    constructor(name, events) {
        this.checkState = () => {
            const action = currentAction;
            if (action.action !== 'state_changed') {
                return;
            }
            if (action.payload.entity_id === `${this.name}_motion`) {
                const motionState = this.motion === false ? this.motionStarted : this.motionStopped;
                if (motionState) {
                    return motionState();
                }
            }
        };
        this.name = name;
        if (!events) {
            return;
        }
        if (events.motionStarted) {
            this.motionStarted = events.motionStarted;
        }
        if (events.motionStopped) {
            this.motionStopped = events.motionStopped;
        }
    }
    get temp() {
        return getState()[`${this.name}_temperature`] || -1;
    }
    get light() {
        return getState()[`${this.name}_light_level`] || -1;
    }
    get motion() {
        return getState()[`${this.name}_motion`] || false;
    }
}
class HueRemote {
    constructor(name, eventActions) {
        this.checkState = () => {
            const action = currentAction;
            if (action.action !== 'hue_event') {
                return;
            }
            if (action.payload.id === `${this.name}`) {
                switch (action.payload.event) {
                    case HueEvent.ON_PRESS:
                        if (this.onPressed) {
                            return this.onPressed();
                        }
                        break;
                    case HueEvent.ON_RELEASE:
                        if (this.onRelease) {
                            return this.onRelease();
                        }
                        break;
                    case HueEvent.ON_LONG_RELEASE:
                        if (this.onLongRelease) {
                            return this.onLongRelease(this.holdTime);
                        }
                        break;
                    case HueEvent.UP_PRESS:
                        if (this.upPressed) {
                            return this.upPressed();
                        }
                        break;
                    case HueEvent.UP_RELEASE:
                        if (this.upRelease) {
                            return this.upRelease();
                        }
                        break;
                    case HueEvent.UP_LONG_RELEASE:
                        if (this.upLongRelease) {
                            return this.upLongRelease(this.holdTime);
                        }
                        break;
                    case HueEvent.DOWN_PRESS:
                        if (this.downPressed) {
                            return this.downPressed();
                        }
                        break;
                    case HueEvent.DOWN_RELEASE:
                        if (this.downRelease) {
                            return this.downRelease();
                        }
                        break;
                    case HueEvent.DOWN_LONG_RELEASE:
                        if (this.downLongRelease) {
                            return this.downLongRelease(this.holdTime);
                        }
                        break;
                    case HueEvent.OFF_PRESS:
                        if (this.offPressed) {
                            return this.offPressed();
                        }
                        break;
                    case HueEvent.OFF_RELEASE:
                        if (this.offRelease) {
                            return this.offRelease();
                        }
                        break;
                    case HueEvent.OFF_LONG_RELEASE:
                        if (this.offLongRelease) {
                            return this.offLongRelease(this.holdTime);
                        }
                        break;
                }
            }
        };
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
    get holdTime() {
        return getState()[`${this.name}-count`] || 0;
    }
}
const messagesToFire = [];
let currentAction;
const profiles = [];
const MotionSensors = {
    kitchen: new MotionSensor(stateKeys.motion.kitchen),
    office: new MotionSensor(stateKeys.motion.office),
    bathroom: new MotionSensor(stateKeys.motion.bathroom),
    bedroom: new MotionSensor(stateKeys.motion.bedroom),
    livingroom: new MotionSensor(stateKeys.motion.livingroom),
};
const Remotes = {
    office: new HueRemote(stateKeys.dimmer.office),
    bedroom: new HueRemote(stateKeys.dimmer.bedroom),
    kitchen: new HueRemote(stateKeys.dimmer.kitchen),
    bathroom: new HueRemote(stateKeys.dimmer.bathroom),
};
// Helpers
const getState = () => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.get("state") || { true: true };
};
const setState = (state) => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.set("state", state);
};
const log = (...msg) => {
    const state = getState();
    if (state[stateKeyVals.logMute]) {
        return;
    }
    //@ts-ignore node log
    node.warn(msg);
};
const includesAny = (arg, toTest) => {
    for (const value of arg) {
        if (toTest.includes(value)) {
            return true;
        }
    }
    return false;
};
const getProfileThatIsMostLikely = () => {
    let greatestProfileMatchCoung = 0;
    let result = null;
    for (const profile of profiles) {
        const matchCount = profile.getMatchingProfileValues();
        const matchCountGreater = matchCount > greatestProfileMatchCoung;
        const matchCountEqualToOrGreatest = matchCount >= greatestProfileMatchCoung;
        const profilePriorityGreater = profile.priority > (result ? result.priority : -1);
        if ((matchCountGreater && !profile.doStack) || (profilePriorityGreater && matchCountEqualToOrGreatest && !profile.doStack)) {
            greatestProfileMatchCoung = matchCount;
            result = profile;
        }
    }
    return result;
};
const getStackedProfiles = () => {
    let stackedProfiles = [];
    for (const profile of profiles) {
        const matchCount = profile.getMatchingProfileValues();
        if (matchCount > 0 && profile.doStack) {
            stackedProfiles.push(profile);
        }
    }
    return stackedProfiles;
};
const fireLightOnAction = (settings) => {
    if (settings.color_temp || (!settings.color_temp && !settings.rgb_color)) {
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            color_temp: settings.color_temp || DEFAULT.warmth,
            entity_id: settings.lightId,
            topic: settings.lightId,
            rate: DEFAULT.delay,
            state: 'turn_on',
        });
    }
    if (settings.rgb_color) {
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            rgb_color: settings.rgb_color,
            entity_id: settings.lightId,
            topic: settings.lightId,
            rate: DEFAULT.delay,
            state: 'turn_on',
        });
    }
};
const fireLightOffAction = (lightId, delayMs) => {
    messagesToFire.push({
        entity_id: lightId,
        topic: lightId,
        rate: delayMs || DEFAULT.delay,
        state: 'turn_off',
    });
};
const checkProfileStates = (profiles) => {
    let state = {};
    profiles.forEach(profile => {
        state = { ...state, ...profile.checkStates() };
    });
    return state;
};
const getStateValue = (key) => {
    return getState()[`${key}`];
};
// Controller
const translateToDispatch = (msg) => {
    if (!msg || !msg.payload || !msg.payload.event_type) {
        return;
    }
    if (msg.payload.event_type === 'state_changed') {
        const actionData = msg.payload.event;
        if (actionData && actionData.new_state) {
            currentAction = { action: msg.payload.event_type, payload: actionData.new_state };
            doDispatch(currentAction);
            return;
        }
    }
    if (msg.payload.event_type === 'hue_event') {
        const actionData = msg.payload.event;
        if (actionData) {
            currentAction = { action: msg.payload.event_type, payload: actionData };
            doDispatch(currentAction);
        }
        return;
    }
};
const doDispatch = (action) => {
    const currentState = getState();
    const result = dispatch(action, currentState);
    const newState = { ...currentState, ...result };
    setState(newState);
};
const dispatch = (action, state) => {
    const mainProfile = getProfileThatIsMostLikely();
    const stackProfiles = getStackedProfiles();
    mainProfile?.init();
    stackProfiles.forEach(profile => {
        profile.init();
    });
    log(mainProfile?.name, (mainProfile?.checkStates() || [])[`${stateKeyVals.motionEnabled}`]);
    let newState;
    switch (action.action) {
        case 'state_changed':
            newState = handleStateCanged(action, state);
            newState = { ...newState, ...checkProfileStates(stackProfiles), ...mainProfile?.checkStates() };
            return newState;
        case 'hue_event':
            newState = handleHueEvent(action, state);
            newState = { ...newState, ...checkProfileStates(stackProfiles), ...mainProfile?.checkStates() };
            return newState;
        default:
            return {};
    }
};
// Services
const handleStateCanged = (action, state) => {
    if (includesAny(['switch.nodered_', 'camera.', 'last_'], action.payload.entity_id)) {
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
    };
};
const handleHueEvent = (action, state) => {
    const eventIdAsString = (action.payload.event + '');
    // HELD
    if (eventIdAsString[3] === '1') {
        const countKey = `${action.payload.id}-count`;
        if (state[`${countKey}`] < 0) {
            return {
                [`${countKey}`]: 2
            };
        }
        else {
            return {
                [`${countKey}`]: state[`${countKey}`] + 1
            };
        }
    }
    // LONG_RELEASED
    if (eventIdAsString[3] === '3') {
        return {
            [`${action.payload.id}-count`]: -1
        };
    }
};
const defaultMotionActionSetup = (lightOffDelayMs, brightness_pct, roomDelayMs) => {
    MotionSensors.kitchen.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.kitchen,
            brightness_pct: brightness_pct || 100,
        });
    };
    MotionSensors.bathroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.bathroom,
            brightness_pct: brightness_pct || 100,
        });
    };
    MotionSensors.livingroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.livingroom,
            brightness_pct: brightness_pct || 100,
        });
    };
    MotionSensors.bedroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.bedroom,
            brightness_pct: brightness_pct || 100,
        });
    };
    if (lightOffDelayMs) {
        MotionSensors.kitchen.motionStopped = () => {
            fireLightOffAction(stateKeys.light.kitchen, roomDelayMs?.kitchen || lightOffDelayMs);
        };
        MotionSensors.bathroom.motionStopped = () => {
            fireLightOffAction(stateKeys.light.bathroom, roomDelayMs?.bathroom || (5 * TIME.minute)); // BATHROOM DELAY always the same
        };
        MotionSensors.livingroom.motionStopped = () => {
            fireLightOffAction(stateKeys.light.livingroom, roomDelayMs?.livingroom || lightOffDelayMs);
        };
        MotionSensors.bedroom.motionStopped = () => {
            fireLightOffAction(stateKeys.light.bedroom, roomDelayMs?.bedroom || lightOffDelayMs);
        };
    }
};
const motionDisabledActionSetup = () => {
    MotionSensors.kitchen.motionStarted = () => {
    };
    MotionSensors.bathroom.motionStarted = () => {
        fireLightOnAction({
            lightId: stateKeys.light.bathroom,
            brightness_pct: 100,
        });
    };
    MotionSensors.livingroom.motionStarted = () => {
    };
    MotionSensors.bedroom.motionStarted = () => {
    };
    MotionSensors.kitchen.motionStopped = () => {
    };
    MotionSensors.bathroom.motionStopped = () => {
        fireLightOffAction(stateKeys.light.bathroom, (5 * 60000)); // BATHROOM DELAY always the same
    };
    MotionSensors.livingroom.motionStopped = () => {
    };
    MotionSensors.bedroom.motionStopped = () => {
    };
};
const defaultRemoteActionSetup = () => {
    const disableMotion = (holdLength) => {
        if (holdLength && holdLength < 2) {
            return;
        }
        return {
            [`${stateKeyVals.motionEnabled}`]: false
        };
    };
    const enableMotion = (holdLength) => {
        if (holdLength && holdLength < 2) {
            return;
        }
        return {
            [`${stateKeyVals.motionEnabled}`]: true
        };
    };
    Remotes.office.upLongRelease = (holdLength) => {
        if (holdLength && holdLength >= 7) {
            return { [`${stateKeyVals.logMute}`]: false };
        }
        return enableMotion(holdLength);
    };
    Remotes.bedroom.upLongRelease = enableMotion;
    Remotes.kitchen.upLongRelease = enableMotion;
    Remotes.bathroom.upLongRelease = enableMotion;
    Remotes.office.downLongRelease = (holdLength) => {
        if (holdLength && holdLength >= 7) {
            return { [`${stateKeyVals.logMute}`]: true };
        }
        return disableMotion(holdLength);
    };
    Remotes.bedroom.downLongRelease = disableMotion;
    Remotes.kitchen.downLongRelease = disableMotion;
    Remotes.bathroom.downLongRelease = disableMotion;
    Remotes.office.onPressed = () => fireLightOnAction({ lightId: stateKeys.light.office });
    Remotes.bedroom.onPressed = () => fireLightOnAction({ lightId: stateKeys.light.bedroom });
    Remotes.kitchen.onPressed = () => fireLightOnAction({ lightId: stateKeys.light.kitchen });
    Remotes.bathroom.onPressed = () => fireLightOnAction({ lightId: stateKeys.light.bathroom });
    Remotes.office.offPressed = () => fireLightOffAction(stateKeys.light.office);
    Remotes.bedroom.offPressed = () => fireLightOffAction(stateKeys.light.bedroom);
    Remotes.kitchen.offPressed = () => fireLightOffAction(stateKeys.light.kitchen);
    Remotes.bathroom.offPressed = () => fireLightOffAction(stateKeys.light.bathroom);
};
// Profiles
profiles.push(new Profile('defaultActions', 0, [
    {
        compare: () => true,
    },
], () => {
    defaultRemoteActionSetup();
}, true), new Profile('kyle-only', 0, [
    {
        compare: () => {
            if (getStateValue(stateKeys.people.kyle.location) === 'home') {
                return getStateValue(stateKeys.people.molly.location) !== 'home';
            }
            return false;
        },
    },
], () => {
    defaultMotionActionSetup(10 * TIME.second);
    defaultRemoteActionSetup();
}), new Profile('molly-home', 1, [
    {
        compare: () => getStateValue(stateKeys.people.molly.location) === 'home',
    },
], () => {
    defaultMotionActionSetup((TIME.minute * 30));
}), new Profile('someone-sleepy', -1, [
    {
        compare: () => false,
    },
], () => {
    defaultMotionActionSetup(TIME.minute * 2, 20);
    MotionSensors.bedroom.motionStarted = () => { };
    MotionSensors.bedroom.motionStopped = () => { };
}, true), new Profile('motion-disabled', -1, [
    {
        compare: () => !getStateValue(stateKeyVals.motionEnabled)
    }
], () => {
    motionDisabledActionSetup();
}, true));
//@ts-expect-error call main method with message
translateToDispatch(msg);
if (messagesToFire) {
    //@ts-expect-error return messages from node
    return [messagesToFire];
}
