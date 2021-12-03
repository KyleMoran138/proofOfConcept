interface User 
{
    id: number,
    first_name: string,
    last_name: string,
    email: string,
    phone_number: string,
    postal_code: string,
    country: string,
    state: string,
    city: string,
    address: string,
    language: string,
    timezone: unknown,
    image: string,
    unlock_pin: unknown,
    user_type: [
        {
            subscriber: number,
            type: string,
        }
    ],
    allow_app_analytics: boolean,
    needs_onboarding: boolean,
    vehicle_access: [
        {
            vehicle_permission_id: number,
            role: number,
            vehicle: number,
            subscriber: number,
            exclusive_access: boolean,
            access_start: string,
            access_end: unknown,
            shared_date_from: string,
            shared_date_to: unknown,
            is_shared: boolean
        }
    ],
    dealer_id: unknown,
    is_password_set: boolean,
    custom_ui_last_update_date: string,
    custom_filter_last_update_date: unknown
}

export default User;