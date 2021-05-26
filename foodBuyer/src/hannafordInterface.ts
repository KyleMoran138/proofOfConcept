import { Page } from 'puppeteer';

const getCartQuantity = async (page: Page): Promise<number> => {
    await page.goto('https://www.hannaford.com/');
    const cart = await page.$('#cartCountNumber');
      const count: number = (await cart?.getProperty('innerHTML'))?._remoteObject.value;
    return count;
  }
  
const addItemToCart = async (page: Page, itemUrl: string) => {
  await page.goto(itemUrl);
  const addToCartButton = await page.$x('//*[@id="productForm"]/div[1]/div[2]/div[7]/div/div[1]/table/tbody/tr/td/div/button');
  await addToCartButton[0].click();
}