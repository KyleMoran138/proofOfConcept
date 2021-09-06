import * as fs from 'fs';

export const argMap = new Map<string, Arg>([
  ['--outDir', {
    name: 'outDir',
    processFunc: (param) => {
      if(!fs.existsSync(param)){
        return false;
      }
      return param;
    },
    err: (param, end) => {
      console.log(`Output path '${param}' does not exist. Exiting!`);
      if(end) end();
    }
  }],
  ['--type', {
    name: 'type',
    processFunc: (param) => {
      const validTypes = ['tiff', 'pnm', 'png', 'jpeg']
      if(validTypes.find((validType) => param === validType)){
        return param;
      }
      return false; 
    }
  }],
  ['--device', {name: 'deviceId'}],
  ['--res', {
    name: 'resolution',
    processFunc: (param) => {
      const resolution = Number(param);
      if(resolution === NaN || resolution < 100 || resolution > 1200){
        return false;
      }
      return param; 
    },
    err: (param, end) => {
      console.log(`Resolution '${param}' is invalid. Resolution must be grater than 100 and less than 1200.\nUsing default resolution`);
    }
  }],
  ['--startNum', {
    name: 'startingCount',
    processFunc: (param) => {
      const startingCount = Number(param);
      if(startingCount === NaN || startingCount < 0){
        return false;
      }
      return param; 
    },
    err: (param, end) => {
      console.log(`Starting number '${param}' is invalid. Must be a number and a value above 0`);
    }
  }],
]);

interface Arg{
  name: string;
  processFunc?: (param: string) => string | false;
  err?: (param: string, end?: () => void) => void
}

export const parseArgs = (params: string[], errExit?: () => void): Map<string, string> => {
  const returnMap = new Map();
  for (const [index, val] of params.entries()) {
      const currentParam = argMap.get(val);

      if(currentParam && params.length > index+1){
          const originalParamValue =  params[index+1];
          let paramValue: string | false = originalParamValue;

          if(currentParam.processFunc){
              paramValue = currentParam.processFunc(paramValue);
          }
          if(paramValue === false){
              if(currentParam.err){
                  currentParam.err(originalParamValue, errExit);
              }else{
                  console.log(`The value "${originalParamValue}" is not valid for the param "${currentParam.name}"`);
              }
          }else{
              returnMap.set(currentParam.name, params[index+1]);
          }
      }
  }
  return returnMap;
} 