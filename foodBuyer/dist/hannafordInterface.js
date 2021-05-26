"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getCartQuantity = async (page) => {
    await page.goto('https://www.hannaford.com/');
    const cart = await page.$('#cartCountNumber');
    const count = (await cart?.getProperty('innerHTML'))?._remoteObject.value;
    return count;
};
const addItemToCart = async (page, itemUrl) => {
    await page.goto(itemUrl);
    const addToCartButton = await page.$x('//*[@id="productForm"]/div[1]/div[2]/div[7]/div/div[1]/table/tbody/tr/td/div/button');
    await addToCartButton[0].click();
};
