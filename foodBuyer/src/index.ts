import { ConfigInterface } from './model/configInterface';
import { default as configData} from './config';
import { NotionClient } from './service/notion';
import { Page } from './model/notion/page';

const config = (configData as ConfigInterface)

const main = async () => {
    const client: NotionClient = new NotionClient(config.notion.apiKey);

    try{
        const data = await client.queryDatabase(config.notion.databaseId);
    
        if(data === undefined){
            console.log('No data');
            return;
        }

        console.log('RESULTS');
        for (const page of data.results) {
            console.log('PAGE', (page as Page).properties);
        }

    }catch( error ){
        console.log('YIKES!', error);        
    }


}

main();
