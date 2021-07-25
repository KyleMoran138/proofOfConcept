export interface Page {
    id: string;
    created_time: string;
    last_edited_time: string;
    parent: any;
    archived: boolean;
    properties: {
        [key: string]: Property
    };
}

export interface Property {
    id: string, 
    type: 'select' | 'checkbox' | 'relation' | 'multi_select' | 'title' | 'rollup',
    select?: any,
    rollup?: any,
    checkbox?: boolean,
    relation?: any[],
    multi_select?: any[],
    title?: any[],
}