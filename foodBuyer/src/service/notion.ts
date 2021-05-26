import { Headers } from 'node-fetch';
import { ApiError } from '../model/apiError';
import { List } from '../model/notion/list';
const fetch = require('node-fetch');

export class NotionClient {
    private readonly _apiKey: string;
    private readonly _baseUrl = 'https://api.notion.com/v1'

    constructor(apiKey: string){
        this._apiKey = apiKey;
    }

    public getDatabase = async (databaseId: string): Promise<any> => {
        return handleResponse(fetch(
            `${this._baseUrl}/databases/${databaseId}`,
            {
                method: "GET",
                headers: generateHeaders(this._apiKey),
            }
        ));
    }

    public queryDatabase = async (databaseId: string): Promise<List | ApiError | undefined> => {
        return handleResponse(fetch(
            `${this._baseUrl}/databases/${databaseId}/query`,
            {
                method: 'POST',
                headers: generateHeaders(this._apiKey),
                body: JSON.stringify({}),
            }
        ));
    }
    
}

const generateHeaders = (apiKey: string): Headers => {
    return new Headers({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2021-05-13',
    });
} 

const handleResponse = async (fetchCall: any): Promise<List | ApiError | undefined> => {
    const response = await ( await fetchCall).json();
    if(response?.object === 'error'){
        return (response as ApiError);
    }

    if(response?.object === 'list'){
        return (response as List);
    }

    return undefined;
}