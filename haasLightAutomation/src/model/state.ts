import { Action } from './action';
import { Timer } from './timer';
import { Event } from './event';

export interface State {
  events?: Event[],
  timers?: Map<string, Timer>,
  actions?: Action[],
}