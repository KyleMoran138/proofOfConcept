export interface Setting{
  brightness?: number,
  state: SettingState,
}

export enum SettingState {
  OFF,
  ON,
}