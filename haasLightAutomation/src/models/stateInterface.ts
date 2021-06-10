
interface StateInterface {
  timers?: Map<string, number[]>;
  sunAboveHorizon?: boolean;
  home?: {
    [key: string]: boolean,
  }
  event?: string,
  stateMap?: Map<StateInterface, Map<string, Action[]>>;
}