import { Action } from './action';

export interface Timer {
  epochTimeToFire: Number,
  eventToFire: string,
}