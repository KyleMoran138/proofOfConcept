import { exec } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import { parseArgs } from './argMap';

let documentNumber = 1;
let page = 0;
let firstDocumentScanned = false;
const runningConversions: Promise<any>[] = [];
let conversionsComplete = 0;
let doRun = true;
var args = process.argv.slice(2);
let configValues: any = {
    outDir: '.',
    type: 'tiff',
    deviceId: '',
    resolution: '600'
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function sh(cmd: string) {
    return new Promise(function (resolve, reject) {
        exec(cmd, (err, stdout, stderr) => {
        if (err) {
            reject(err);
        } else {
            resolve({ stdout, stderr });
        }
        });
    });
}
  
const main = async () => {
    for (const [key, value] of parseArgs(args, exit)) {
        configValues[key] = value;   
    }
    if(configValues.startingCount){
        documentNumber = configValues.startingCount;
        console.log(`\nStarting document number: ${documentNumber}`);
    }
    while(fs.existsSync(`${configValues.outDir}/.DOCUMENT-${documentNumber}/`)){
        documentNumber++;
    }

    if(doRun){
        await runLoop(runLoop)
    }else{
        exit();
    }
}

const runLoop = async (callback: (callback: any) => Promise<void>) => {
    rl.question("Enter option\n\
    Press enter to contuine\n\
    Press X to stop\n\
    Press n for next document: ", async (answer) => {
        let skipScan = false;
        let running = true;
        let startingDocNumber = documentNumber;
        switch(answer){
            case '':
                page++;
                break;
            case 'x':
                running = false;
                skipScan = true;
                break;
            case 'n':
                documentNumber++;
                page = 1;
                break;
            default:
                console.log('Invalid!');
                skipScan = true;
                break;
        }

        if(firstDocumentScanned && (startingDocNumber < documentNumber || !running)){
            const convertAndRemoveCommand = `
                convert '${configValues.outDir}/.DOCUMENT-${startingDocNumber}/page-*.${configValues.type}' '${configValues.outDir}/DOCUMENT-${startingDocNumber}.pdf' \
                && rm -rf '${configValues.outDir}/.DOCUMENT-${startingDocNumber}'`;
            runningConversions.push(sh(convertAndRemoveCommand).then(() => {
                conversionsComplete++;
            }));
        }
        
        if(!running){
            exit();
        }else{
            if(!fs.existsSync(`${configValues.outDir}/.DOCUMENT-${documentNumber}/`)){
                fs.mkdirSync(`${configValues.outDir}/.DOCUMENT-${documentNumber}/`);
            }
            const scanCommand = `scanimage ${configValues.deviceId ? `-d '${configValues.deviceId}' ` : ''}--mode Color --source ADF --format=${configValues.type} --resolution ${configValues.resolution} -o '${configValues.outDir}/.DOCUMENT-${documentNumber}/page-${page}.${configValues.type}'`;
            console.log(`\nScanning page ${page} for document ${documentNumber}\n`);
            await sh(scanCommand);
            firstDocumentScanned = true;
            callback(runLoop);
        }
    });
}

const exit = async () => {
    if(doRun){
        if(runningConversions.length > conversionsComplete){
            console.log('\nWaiting for running conversions to finish...');
            await Promise.all(runningConversions);
        }
        console.log('\nBye 👋');
        rl.close();
        doRun = false;
    }
}


rl.on('SIGINT', exit);

main();