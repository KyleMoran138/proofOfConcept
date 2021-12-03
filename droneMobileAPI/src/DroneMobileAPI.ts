import Amplify, { Auth } from 'aws-amplify';
import fetch from 'node-fetch';
import Car from './model/car';
import PagedDataResponse from './model/pagedDataResponse';
import RemoteCommand from './model/RemoteCommand.enum';
import SendCommandResponse from './model/sendCommandResponse';
import User from './model/user'

//@ts-expect-error Fix node-fetch thing
global.fetch = fetch;

class DroneMobileAPI {
  user = null;

  constructor(config: any){
    //@ts-ignore Node hack :(
    Amplify.default.configure(config);
  }

  private _generateAuthHeader = async () => {
    const session = await Auth.userSession(this.user);
    return {
      'authorization': `Bearer ${session.getIdToken().getJwtToken()}`
    }
  }

  private _generateCommandAuthHeader = async () => {
    const session = await Auth.userSession(this.user);
    return {
      'x-drone-api': `${session.getIdToken().getJwtToken()}`
    }
  }

  init = async (username: string, password: string) => {
    this.user = await Auth.signIn(username, password);
    return this;
  }

  getUserData = async (): Promise<PagedDataResponse<User> | null> => {
    const result = await fetch('https://api.dronemobile.com/api/v1/user', {
      headers: {
        ...(await this._generateAuthHeader())
      },
      method: 'GET'
    });
    
    if(result.ok){
      const userData = (await result.json()) as PagedDataResponse<User>;
      return userData;
    }

    console.error('Something went wrong', result.statusText)
    return null;
  }

  getCarData = async (): Promise<PagedDataResponse<Car> | null> => {
    const result = await fetch('https://api.dronemobile.com/api/v1/vehicle?limit=10', {
      headers: {
        ...(await this._generateAuthHeader())
      },
      method: 'GET'
    });
    
    if(result.ok){
      const carData = (await result.json()) as PagedDataResponse<Car>;
      return carData;
    }

    console.error('Something went wrong', result.statusText)
    return null;
  }

  sendCommand = async (deviceKey: string, command: RemoteCommand): Promise<SendCommandResponse | null> => {
    const result = await fetch('https://accounts.dronemobile.com/api/iot/send-command', {
      headers: {
        ...(await this._generateCommandAuthHeader()),
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        command: command,
        deviceKey: deviceKey
      })
    });

    if(result.ok){
      const sendCommandData = (await result.json()) as SendCommandResponse;
      return sendCommandData;
    }

    console.error('Something went wrong', result.statusText)
    return null;
  }

}

export default DroneMobileAPI;