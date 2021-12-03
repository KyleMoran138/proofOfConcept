import DroneMobileAPI from 'drone-mobile/lib/DroneMobileAPI.js';
import * as dotenv from 'dotenv';
import RemoteCommand from 'drone-mobile/lib/model/RemoteCommand.enum.js';
dotenv.config();

const main = async () => {
  console.log('Sending request');

  const api = await (new DroneMobileAPI({
      identityPoolId: process.env.DRONE_API_IDENTITYPOOLID,
      region: process.env.DRONE_API_REGION,
      userPoolId: process.env.DRONE_API_USERPOOLID,
      userPoolWebClientId: process.env.DRONE_API_USERPOOLWEBCLIENTID,
      authenticationFlowType: process.env.DRONE_API_AUTHENTICATIONFLOWTYPE,
    }
  ).init(
    process.env.DRONE_USERNAME || '',
    process.env.DRONE_PASSWORD || ''
  ));

  // api.sendCommand("10228089178", RemoteCommand.remote_stop);
  const carData = await api.getCarData()
  const car = carData?.results[0];

  if(!car){
    throw new Error('No cars on account!');
  }

  const response = await api.sendCommand(car.device_key, RemoteCommand.REFRESH);
  if(!response){
    throw new Error('command failed!');
  }

  console.log('trunk open', response.parsed.controller.trunk_open)
}

main();