import DroneMobileAPI from 'drone-mobile/lib/DroneMobileAPI.js';
import RemoteCommand from 'drone-mobile/lib/model/RemoteCommand.enum.js';
import * as dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  console.log('locking car');
  console.log('process', process.env.DRONE_USERNAME)
  const api = await (new DroneMobileAPI({
      identityPoolId: process.env.DRONE_API_IDENTITYPOOLID,
      region: process.env.DRONE_API_REGION,
      userPoolId: process.env.DRONE_API_USERPOOLID,
      userPoolWebClientId: process.env.DRONE_API_USERPOOLWEBCLIENTID,
      authenticationFlowType: process.env.DRONE_API_AUTHENTICATIONFLOWTYPE,
    }
  ).init(
    process.env.DRONE_USERNAME,
    process.env.DRONE_PASSWORD
  ));

  api.sendCommand("10228089178", RemoteCommand.arm);
}

main();