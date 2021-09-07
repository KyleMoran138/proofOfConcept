"use strict";
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
};
class Profile {
    constructor(name, stateMap, runStateChangedEffects, runHueEventEffects) {
        this.name = "";
        this.stateMap = [];
        this.compare = (state) => {
            let matchedStates = 0;
            for (const check of this.stateMap) {
                if (!state[check.key]) {
                    return matchedStates;
                }
                const stateValue = state[check.key];
                switch (check.compariator) {
                    case 'eq':
                        if (stateValue === check.value) {
                            matchedStates = matchedStates + (check.pointBuff || 1);
                        }
                    case 'neq':
                        if (stateValue === check.value) {
                            matchedStates = matchedStates + (check.pointBuff || 1);
                        }
                    case 'lt':
                        if (Number(stateValue) < Number(check.value)) {
                            matchedStates = matchedStates + (check.pointBuff || 1);
                        }
                    case 'gt':
                        if (Number(stateValue) > Number(check.value)) {
                            matchedStates = matchedStates + (check.pointBuff || 1);
                        }
                }
            }
            return matchedStates;
        };
        this.name = name;
        this.stateMap = stateMap;
        this.runHueEventEffects = runHueEventEffects;
        this.runStateChangedEffects = runStateChangedEffects;
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
                    motionState();
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
        log('motion state', getState()[`${this.name}_motion`]);
        return getState()[`${this.name}_motion`] || false;
    }
}
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
const messagesToFire = [];
let currentAction;
const profiles = [
    new Profile('kyle-only', [
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
    ], () => {
        const MotionSensors = {
            kitchen: new MotionSensor(DeviceIds.motion.kitchen),
            office: new MotionSensor(DeviceIds.motion.office),
        };
        MotionSensors.office.motionStarted = () => {
            fireLightOnAction({
                lightId: DeviceIds.light.kitchen,
                brightness_pct: 100,
                rgb_color: [255, 255, 0],
            });
        };
        MotionSensors.office.motionStopped = () => {
            fireLightOffAction(DeviceIds.light.kitchen, 10000);
        };
        for (const motionSensor of Object.values(MotionSensors)) {
            motionSensor.checkState();
        }
    }),
    new Profile('both-home', [
        {
            key: DeviceIds.people.kyle.home,
            value: 'home',
            compariator: 'eq',
        },
        {
            key: DeviceIds.people.molly.home,
            value: 'home',
            compariator: 'eq',
        },
    ], (action, state) => {
        if (action.payload.entity_id === DeviceIds.motion.livingroom) {
            if (state[action.payload.entity_id] === true) {
                const lightUpdate = {
                    brightness_pct: 100,
                    color_temp: 100,
                    entity_id: DeviceIds.light.livingroom,
                    rate: 2,
                    topic: DeviceIds.light.livingroom,
                    state: 'turn_on'
                };
                messagesToFire.push(lightUpdate);
            }
            else {
                messagesToFire.push({
                    rate: 10,
                    entity_id: DeviceIds.light.kitchen,
                    state: 'turn_off',
                    topic: DeviceIds.light.kitchen
                });
            }
        }
    })
];
// Helpers
const getState = () => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.get("state");
};
const setState = (state) => {
    //@ts-expect-error flow doesn't exist in normal context
    return flow.set("state", state);
};
const log = (...msg) => {
    const state = getState();
    if (state['log-mute']) {
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
const getProfileThatIsMostLikely = (state) => {
    let highestMatchCount = 0;
    let result = null;
    for (const profile of profiles) {
        const matchCount = profile.compare(state);
        if (matchCount > highestMatchCount) {
            highestMatchCount = matchCount;
            result = profile;
        }
    }
    return result;
};
const fireLightOnAction = (settings) => {
    if (settings.color_temp) {
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            color_temp: settings.color_temp || DEFAULT.color,
            entity_id: settings.lightId,
            topic: settings.lightId,
            rate: DEFAULT.delay,
            state: 'turn_on',
        });
    }
    if (settings.rgb_color) {
        messagesToFire.push({
            brightness_pct: settings.brightness_pct || DEFAULT.brightness,
            rgb_color: settings.rgb_color || DEFAULT.color.red,
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
const fireLightAction = (settings) => {
    fireLightOnAction({ ...settings });
    if (settings.turnOffDelayMs && settings.turnOffDelayMs > 1) {
        fireLightOffAction(settings.lightId, settings.turnOffDelayMs);
    }
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
    const profile = getProfileThatIsMostLikely(state);
    let newState;
    switch (action.action) {
        case 'state_changed':
            newState = handleStateCanged(action, state);
            if (profile?.runStateChangedEffects) {
                profile?.runStateChangedEffects(action, newState);
            }
            return newState;
        case 'hue_event':
            newState = handleHueEvent(action, state);
            if (profile?.runHueEventEffects) {
                profile?.runHueEventEffects(action, newState);
            }
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
    if (action.payload.entity_id.includes('_light_level')) {
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
                [`${countKey}`]: 1
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
//@ts-expect-error call main method with message
translateToDispatch(msg);
if (messagesToFire) {
    //@ts-expect-error return messages from node
    return [messagesToFire];
}
