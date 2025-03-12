import { Handler } from 'aws-lambda';
import { scrap } from './src/scrapper';

export const handler = async () => {
  await scrap({ headless: true });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello, world!' }),
  };
};


handler();
