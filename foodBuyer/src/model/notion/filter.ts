export default interface Filter {
    // Property name to filter
    property: string,
    
    // Filter a title value
    title?: {
        equals?: string,
        does_not_equal?: string,
        contains?: string,
        does_not_contain?: string,
        starts_with?: string,
        ends_with?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a rich_text value
    rich_text?: {
        equals?: string,
        does_not_equal?: string,
        contains?: string,
        does_not_contain?: string,
        starts_with?: string,
        ends_with?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a url value
    url?: {
        equals?: string,
        does_not_equal?: string,
        contains?: string,
        does_not_contain?: string,
        starts_with?: string,
        ends_with?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a email value
    email?: {
        equals?: string,
        does_not_equal?: string,
        contains?: string,
        does_not_contain?: string,
        starts_with?: string,
        ends_with?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a phone value
    phone?: {
        equals?: string,
        does_not_equal?: string,
        contains?: string,
        does_not_contain?: string,
        starts_with?: string,
        ends_with?: string,
        is_empty?: true,
        is_not_empty?: true,
    }
    
    // Filter a number value
    number?: {
        equals?: number,
        does_not_equal?: number,
        is_empty?: true,
        is_not_empty?: true,
        grater_than?: number,
        less_than?: number,
        grater_than_or_equal_to?: number,
    }

    // Filter a checkbox value
    checkbox?: {
        equals?: boolean,
        does_not_equal?: boolean,
    }

    // Filter a select condition
    select?: {
        equals?: string,
        does_not_equal?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a multi-select condition
    multi_select?: {
        contains?: string,
        does_not_contain?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a date condition
    date?: {
        equals?: string,
        before?: string,
        after?: string,
        on_or_before?: string,
        is_empty?: true,
        is_not_empty?: true,
        on_or_after?: string,
        past_week?: {},
        past_month?: {},
        past_year?: {},
        next_week?: {},
        next_month?: {},
        next_year?: {},
    }

    // Filter a created_time condition
    created_time?: {
        equals?: string,
        before?: string,
        after?: string,
        on_or_before?: string,
        is_empty?: true,
        is_not_empty?: true,
        on_or_after?: string,
        past_week?: {},
        past_month?: {},
        past_year?: {},
        next_week?: {},
        next_month?: {},
        next_year?: {},
    }

    // Filter a last_edited_time condition
    last_edited_time?: {
        equals?: string,
        before?: string,
        after?: string,
        on_or_before?: string,
        is_empty?: true,
        is_not_empty?: true,
        on_or_after?: string,
        past_week?: {},
        past_month?: {},
        past_year?: {},
        next_week?: {},
        next_month?: {},
        next_year?: {},
    }

    // Filter a people condition
    people?: {
        // UUIDv4
        contains?: string,
        // UUIDv4
        does_not_contain?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a created_by condition
    created_by?: {
        // UUIDv4
        contains?: string,
        // UUIDv4
        does_not_contain?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a last_edited_by condition
    last_edited_by?: {
        // UUIDv4
        contains?: string,
        // UUIDv4
        does_not_contain?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a files condition
    files?: {
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a relation condition
    relation?: {
        // UUIDv4
        contains?: string,
        // UUIDv4
        does_not_contain?: string,
        is_empty?: true,
        is_not_empty?: true,
    }

    // Filter a formula condition
    formula?: {
        // Must be a text filter
        text?: Filter,
        // Must be a checkbox filter
        checkbox?: Filter,
        // Must be a number filter
        number?: Filter,
        // Must be a date filter
        date?: Filter,
    }

    and?: Filter[],
    or?: Filter[],
}

export interface FilterFacet {
    property: string,
}