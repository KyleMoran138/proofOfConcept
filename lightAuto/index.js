"use strict";
class HueEvent {
}
HueEvent.ON_PRESS = 1000;
HueEvent.ON_HOLD = 1001;
HueEvent.ON_RELEASE = 1002;
HueEvent.ON_LONG_RELEASE = 1003;
HueEvent.UP_PRESS = 2000;
HueEvent.UP_HOLD = 2001;
HueEvent.UP_RELEASE = 2002;
HueEvent.UP_LONG_RELEASE = 2003;
HueEvent.DOWN_PRESS = 3000;
HueEvent.DOWN_HOLD = 3001;
HueEvent.DOWN_RELEASE = 3002;
HueEvent.DOWN_LONG_RELEASE = 3003;
HueEvent.OFF_PRESS = 4000;
HueEvent.OFF_HOLD = 4001;
HueEvent.OFF_RELEASE = 4002;
HueEvent.OFF_LONG_RELEASE = 4003;
const messagesToFire = [];
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
            return handleStateCanged(action, state);
        case 'hue_event':
            return handleHueEvent(action, state);
        default:
            return {};
    }
};
// Services
const handleStateCanged = (action, state) => {
    if (action.action !== 'state_changed' || includesAny(['switch.nodered_', 'camera.', 'last_'], action.payload.entity_id)) {
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
    if (action.action !== 'hue_event') {
        return;
    }
    const eventIdAsString = (action.payload.event + '');
    // PRESSED
    if (eventIdAsString[3] === '0') {
        log('PRESS');
    }
    // HELD
    if (eventIdAsString[3] === '1') {
        const countKey = `${action.payload.id}-count`;
        log('HOLD', state[`${countKey}`]);
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
    // RELEASED
    if (eventIdAsString[3] === '2') {
        log('RELEASE');
        if (action.payload.event == HueEvent.ON_RELEASE) {
            log('turn on');
            const lightUpdate = {
                rate: 1000,
                topic: '',
                brightness_pct: 100,
                color_temp: 100,
                entity_id: 'light.office_lights',
                state: 'on'
            };
            messagesToFire.push(lightUpdate);
        }
    }
    // LONG_RELEASED
    if (eventIdAsString[3] === '3') {
        log('LONG_RELEASE');
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
