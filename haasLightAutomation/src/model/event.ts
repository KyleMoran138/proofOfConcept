import { Action } from './action';
import { Timer } from './timer';

export interface Event {
  eventName: string,
  actions: Action[],
  timers: Timer[],
}