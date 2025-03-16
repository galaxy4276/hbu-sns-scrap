import { Browser, ElementHandle, LaunchOptions, Page, chromium } from "@playwright/test";
import { optimizeImageForGPT } from "./utils/imageProcessor";
import tesseract from "tesseract.js";
import { Article } from "./db";
import { uploadToS3 } from "./utils/s3";
import { launchChromium } from 'playwright-aws-lambda';

const FIRST_PAGE = 'https://www.hanbat.ac.kr/bbs/BBSMSTR_000000000050/list.do?mno=sub07_01';
const BASE_URL = 'https://www.hanbat.ac.kr/bbs/BBSMSTR_000000000050/view.do?nttId=';

const checkExistsTitle = async (title: string) => {
  const article = await Article.query('title').eq(title).using('TitleIndex').exec();
  return article.length > 0;
};

const extractText = async (link: ElementHandle<SVGElement | HTMLElement>) => {
  const text = await link.textContent();
  return text;
};

const openNewPage = async (browser: Browser) => {
  const newPage = await browser.newPage();
  await newPage.goto(FIRST_PAGE);
  await newPage.waitForLoadState('networkidle');
  return newPage;
};

const extractDetailId = async (link: ElementHandle) => {
  const onclick = await link.getAttribute('onclick');
  const match = onclick?.match(/fn_search_detail\('(.+?)'\)/);
  return match?.[1];
};

const getDetailPageContent = async (page: Page, detailId: string) => {
  await page.evaluate((id) => {
    // @ts-ignore
    fn_search_detail(id);
  }, detailId);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.ui.bbs--view--tit', { state: 'visible' });
  const title = (await page.locator('.ui.bbs--view--tit').textContent() as string).replace(/[\t\n]/g, '').trim();
  console.log('새 페이지 제목:', title);

  const content = await page.locator('#contens');
  const shotBuffer = await content.screenshot();

  return {
    title,
    content,
    shotBuffer
  };
};

const processDetailContent = async (shotBuffer: Buffer) => {
  const optimizedBase64 = await optimizeImageForGPT(shotBuffer);
  const imageUrl = await uploadToS3(shotBuffer);
  const worker = await tesseract.createWorker('kor');
  const ret = await worker.recognize(shotBuffer);
  console.log(`text: ${ret.data.text}`);
  return {
    text: ret.data.text,
    image: optimizedBase64,
    imageUrl
  };
};

export const scrap = async (launchOptions: LaunchOptions) => {
  const browser = process.env.AWS_LAMBDA_FUNCTION_VERSION
    ? await launchChromium(launchOptions)
    : await chromium.launch(launchOptions);
  const page = await browser.newPage();
  
  try {
    await page.goto(FIRST_PAGE, { waitUntil: 'networkidle' });
    
    const titleLinks = (await page.$$('td[data-cell-header="제목"] a')).slice(2);
    // const titleLinks = [(await page.$$('td[data-cell-header="제목"] a'))[3]];
    const results = await Promise.allSettled(
      titleLinks.map(async (link) => {
        const newPage = await openNewPage(browser);
        const id = await extractDetailId(link);
        if (!id) {
          return;
        }
        const content = await getDetailPageContent(newPage, id);
        const originUrl = `${BASE_URL}${id}`;
        console.log({ id, ...content, originUrl });
        const exists = await checkExistsTitle(content.title);
        if (exists) {
          return;
        }
  
        const { text, imageUrl } = await processDetailContent(content.shotBuffer);
        await Article.create({
          id: id,
          title: content.title,
          content: text,
          imageUrl,
          uploaded: false,
          originUrl,
        });
        return true;
      })
    );

    const successCount = results.filter(
      result => result.status === 'fulfilled' && result.value === true
    ).length;
  
    console.log(`성공적으로 처리된 항목 수: ${successCount}`);
  } catch (error) {
    console.error('스크래핑 중 오류 발생:', error);
  } finally {
    // 브라우저 종료
    await browser.close();
  }

};
