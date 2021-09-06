
interface RootMessage<T>{
    payload: {
        event_type: 'state_changed';
        entity_id: string;
        event: T;
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

interface Context{
    id: string;
    parent_id?: string;
    user_id?: string;
}

type State = any;

type Action =
    {action: 'state_changed', payload: StateChange};

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
    //@ts-ignore node log
    node.warn(...msg)
}


// Controller

const main = (msg: RootMessage<unknown>) => {
    if(msg.payload.event_type === 'state_changed' ){
        const actionData = (msg as RootMessage<RootStateChange<StateChange>>).payload.event;
        if(actionData.new_state){
            doDispatch({action: msg.payload.event_type, payload: actionData.new_state})
        }
    }
}

const doDispatch = (action: Action) => {
    const currentState = getState();
    const result: State = dispatch(action, currentState);
    const newState = {...currentState, ...result};
    setState(newState);
}

const dispatch = (action: Action, state: State) => {
    switch(action.action){
        case 'state_changed':
            return handleStateCanged(action, state);

        default:
            return {};
    }
}

const includesAny = (arg: string[], toTest: string): boolean => {
    for (const value of arg) {
        if(toTest.includes(value)){
            return true;
        }
    }
    return false;
}

// Services

const handleStateCanged = (action: Action, state: State): State => {
    if(includesAny( ['switch.nodered_', 'camera.', 'last_'], action.payload.entity_id)){
        return;
    }

    log(`CHANGED: ${action.payload.entity_id}`)

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

//@ts-expect-error call main method with message
main(msg);