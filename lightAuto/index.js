"use strict";
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
    node.warn(...msg);
};
// Controller
const main = (msg) => {
    if (msg.payload.event_type === 'state_changed') {
        const actionData = msg.payload.event;
        if (actionData.new_state) {
            doDispatch({ action: msg.payload.event_type, payload: actionData.new_state });
        }
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
        default:
            return {};
    }
};
const includesAny = (arg, toTest) => {
    for (const value of arg) {
        if (toTest.includes(value)) {
            return true;
        }
    }
    return false;
};
// Services
const handleStateCanged = (action, state) => {
    if (includesAny(['switch.nodered_', 'camera.', 'last_'], action.payload.entity_id)) {
        return;
    }
    log(`CHANGED: ${action.payload.entity_id}`);
    if (action.payload.entity_id.includes('binary_sensor.')) {
        return {
            [action.payload.entity_id]: action.payload.state === "on" ? true : false
        };
    }
    if (action.payload.entity_id.includes('light_level.')) {
        return {
            [action.payload.entity_id]: Number(action.payload.state)
        };
    }
    return {
        [action.payload.entity_id]: action.payload.state
    };
};
//@ts-expect-error call main method with message
main(msg);
