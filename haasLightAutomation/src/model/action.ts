import { Setting } from './setting';

export interface Action {
  entityId: string,
  setting: Setting,
}