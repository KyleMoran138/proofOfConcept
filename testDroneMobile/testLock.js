
import Amplify, { Auth } from 'aws-amplify';
import fetch from 'node-fetch';
import awsConfig from './aws-exports.js'
global.fetch = fetch;

const main = async () => {
  
  // const api = await (new DroneMobileAPI()._init(userData.username, userData.password));

  // api.sendCommand("10228089178", "arm");
}

class DroneMobileAPI {
  user = null;

  constructor(){
    Amplify.default.configure(awsConfig);
  }
  
  _init = async (username, password) => {
    this.user = await Auth.signIn(username, password);
    return this;
  }

  _generateAuthHeader = async () => {
    const session = await Auth.userSession(this.user);
    return {
      'authorization': `Bearer ${session.getIdToken().getJwtToken()}`
    }
  }

  _generateCommandAuthHeader = async () => {
    const session = await Auth.userSession(this.user);
    return {
      'x-drone-api': `${session.getIdToken().getJwtToken()}`
    }
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

  sendCommand = async (deviceKey, command) => {
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

main();