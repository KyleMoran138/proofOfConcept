import Amplify, { Auth } from 'aws-amplify';
import fetch from 'node-fetch';
import RemoteCommand from './model/RemoteCommand.enum';

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

  getUserData = async () => {
    const result = await fetch('https://api.dronemobile.com/api/v1/user', {
      headers: {
        ...(await this._generateAuthHeader())
      },
      method: 'GET'
    });

    console.log('DATAS', JSON.stringify(await result.json()))
  }

  getCarData = async () => {
    const result = await fetch('https://api.dronemobile.com/api/v1/vehicle?limit=10', {
      headers: {
        ...(await this._generateAuthHeader())
      },
      method: 'GET'
    });

    console.log('DATAS', JSON.stringify(await result.json()))
  }

  sendCommand = async (deviceKey: string, command: RemoteCommand) => {
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

    console.log('DATAS', JSON.stringify(await result.json()))
  }

}

export default DroneMobileAPI;