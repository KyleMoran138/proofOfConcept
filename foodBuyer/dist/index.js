"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("./config"));
const notion_1 = require("./service/notion");
const config = config_1.default;
const main = async () => {
    const client = new notion_1.NotionClient(config.notion.apiKey);
    const data = await client.queryDatabase(config.notion.databaseId);
    console.log('YIKES!', data);
};
main();
