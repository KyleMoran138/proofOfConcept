interface SendCommandResponse {
  device_key: string,
  parsed: {
      arm_status: boolean,
      backup_battery_voltage: number,
      cellular_signal_strength: number,
      command_name: string | 'Arm',
      command_sent: string | 'arm',
      command_success: boolean,
      command_timestamp: string,
      controller: {
          armed: boolean,
          auto_door_lock_enabled: boolean,
          current_temperature: number,
          door_open: boolean,
          drive_lock_enabled: boolean,
          engine_on: boolean,
          hood_open: boolean,
          ignition_on: boolean,
          main_battery_voltage: number,
          passive_arming_enabled: boolean,
          reservation_status: boolean,
          shock_sensor_enabled: boolean,
          siren_enabled: boolean,
          timer_start_enabled: boolean,
          trunk_open: boolean,
          turbo_timer_start_enabled: boolean,
          valet_mode_enabled: boolean
      },
      gps_degree: number,
      gps_direction: string | 'NW',
      gps_status: number,
      mileage: number,
      speed: number,
      timestamp: string
  }
}

export default SendCommandResponse;