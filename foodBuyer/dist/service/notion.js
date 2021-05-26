"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionClient = void 0;
const node_fetch_1 = require("node-fetch");
const fetch = require('node-fetch');
class NotionClient {
    constructor(apiKey) {
        this._baseUrl = 'https://api.notion.com/v1';
        this.getDatabase = async (databaseId) => {
            return handleResponse(fetch(`${this._baseUrl}/databases/${databaseId}`, {
                method: "GET",
                headers: generateHeaders(this._apiKey),
            }));
        };
        this.queryDatabase = async (databaseId) => {
            return handleResponse(fetch(`${this._baseUrl}/databases/${databaseId}/query`, {
                method: 'POST',
                headers: generateHeaders(this._apiKey),
                body: JSON.stringify({}),
            }));
        };
        this._apiKey = apiKey;
    }
}
exports.NotionClient = NotionClient;
const generateHeaders = (apiKey) => {
    return new node_fetch_1.Headers({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2021-05-13',
    });
};
const handleResponse = async (fetchCall) => {
    const response = await (await fetchCall).json();
    if (response?.object === 'error') {
        return response;
    }
    if (response?.object === 'list') {
        return response;
    }
    return undefined;
};
