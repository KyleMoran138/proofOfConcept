import puppeteer, { Page } from 'puppeteer';

const main = async () => {
  const browser = await puppeteer.launch({
    headless: false, 
    slowMo: 100
  });
  const page = await browser.newPage();

  let itemsInCartAtStart = await getCartQuantity(page);
  console.log(`Number of items in cart: ${itemsInCartAtStart}`);
}

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

main();
