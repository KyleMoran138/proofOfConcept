"use strict";
class Sensor {
    constructor(name) {
        this.name = "";
        this.name = `sensor.${name}`;
    }
}
Sensor.names = {
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
};
class MotionSensor extends Sensor {
    constructor(name) {
        super(name);
        this.motion = () => {
            return getState()[`${MotionSensor.keyPrefixes.motion}${this.name}${MotionSensor.keySuffixes.motion}`];
        };
        this.lightLevel = () => {
            return getState()[`${this.name}${MotionSensor.keySuffixes.lightLevel}`];
        };
        this.temp = () => {
            return getState()[`${this.name}${MotionSensor.keySuffixes.temp}`];
        };
    }
}
MotionSensor.keySuffixes = {
    lightLevel: '_light_level',
    motion: '_motion',
    temp: '_temperature',
};
MotionSensor.keyPrefixes = {
    motion: 'binary_',
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
const messagesToFire = [];
const motionSensors = new Map([
    ['office', new MotionSensor(Sensor.names.motion.office)],
    ['kitchen', new MotionSensor('kitchen_motion')],
    ['bathroom', new MotionSensor('bathroom_motion')],
    ['livingroom', new MotionSensor('livingroom_motion')],
    ['bedroom', new MotionSensor('bedroom_motion')],
]);
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
// Controller
const translateToDispatch = (msg) => {
    if (!msg || !msg.payload || !msg.payload.event_type) {
        return;
    }
    if (msg.payload.event_type === 'state_changed') {
        const actionData = msg.payload.event;
        if (actionData && actionData.new_state) {
            doDispatch({ action: msg.payload.event_type, payload: actionData.new_state });
            return;
        }
    }
    if (msg.payload.event_type === 'hue_event') {
        const actionData = msg.payload.event;
        if (actionData) {
            doDispatch({ action: msg.payload.event_type, payload: actionData });
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
    switch (action.action) {
        case 'state_changed':
            runStateChangedEffects(action, state);
            return handleStateCanged(action, state);
        case 'hue_event':
            runHueEventEffects(action, state);
            return handleHueEvent(action, state);
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
    if (action.payload.entity_id.includes('light_level.')) {
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
// Effects
const runHueEventEffects = (action, state) => {
    // Protect the state at all costs
    const setState = () => { log('INVALID SET STATE IN EFFECT'); };
    if (action.payload.event === HueEvent.ON_RELEASE) {
        log(action.payload.id);
    }
};
const runStateChangedEffects = (action, state) => {
    // Protect the state at all costs
    const setState = () => { log('INVALID SET STATE IN EFFECT'); };
};
//@ts-expect-error call main method with message
translateToDispatch(msg);
if (messagesToFire) {
    //@ts-expect-error return messages from node
    return [messagesToFire];
}
