
interface RootMessage<T>{
    event_type: string;
    entity_id: string;
    event: T;
    origin?: string;
    time_fired?: string;
}

interface RootStateChange<T>{
    entity_id: string;
    old_state?: T;
    new_state?: T;
}

interface StateChange{
    entity_id: string;
    state?: string | number;
    last_changed?: string;
    last_updated?: string;
}

interface Context{
    id: string;
    parent_id?: string;
    user_id?: string;
}

Type Event = {}

const main = (msg: RootMessage<unknown>) => {
    if(msg.event_type === 'state_changed' ){
        const actionData = (msg as RootMessage<RootStateChange<StateChange>>).event;
        dispatch({type: msg.event_type, action: {...actionData}})        
    }
}

const dispatch = (event: {type: string, action: any}) => {
    switch(event.type)
}

const log = (...msg: any) => {
    //@ts-ignore node log
    node.log(...msg)
}