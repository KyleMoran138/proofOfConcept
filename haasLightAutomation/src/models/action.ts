interface Action {
  entity_id: string,
  setting: Setting,
  timers?: Timer[],
  triggeredByEvent?: string,
  newData?: {
    sunAboveHorizon?: boolean,
    home?: {
      [key: string]: boolean,
    },
    stateMap?: Map<StateInterface, Map<string, Action[]>>,
  }
}
