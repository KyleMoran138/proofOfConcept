import { ConfigInterface } from './model/configInterface';
import { default as configData} from './config';
import { NotionClient } from './service/notion';
import { Error } from './model/error';
import { List } from './model/notion/list';
const config = (configData as ConfigInterface)

const main = async () => {
    const client: NotionClient = new NotionClient(config.notion.apiKey);

    const data = await client.queryDatabase(config.notion.databaseId);

    if(data === undefined){
        console.log('No data');
        return;
    }

    if(data instanceof Error ){
        console.log('Error', data);
        return;
    }

    if(data instanceof List){
        console.log('RESULTS');
        for (const page of data.results) {
            
        }
    }

    
    console.log('YIKES!', data);
}

main();
