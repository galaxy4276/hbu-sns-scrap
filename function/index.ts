import { Handler } from 'aws-lambda';
import { scrap } from './scrapper';

const args = [
  '--single-process', // required
  '--window-size=1920,1080',
  '--use-angle=swiftshader', // required
  '--disable-setuid-sandbox',
  '--no-sandbox',
];

export const handler: Handler = async (event) => {
  await scrap({ headless: false });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello, world!' }),
  };
};

handler({} as any, {} as any, {} as any);
