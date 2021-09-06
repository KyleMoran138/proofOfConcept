"use strict";
const main = (msg) => {
    if (msg.event_type === 'state_changed') {
        const actionData = msg.event;
        dispatch({type: msg.event_type, action: {...actionData}})
    }
};
const log = (...msg) => {
    //@ts-ignore node log
    node.log(...msg);
};

main(msg.payload);