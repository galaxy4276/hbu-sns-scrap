FROM mcr.microsoft.com/playwright:v1.50.0-noble as build-image
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 실행 스테이지
FROM mcr.microsoft.com/playwright:v1.50.0-noble
WORKDIR /app

COPY --from=build-image /app/dist ./dist
COPY --from=build-image /app/node_modules ./node_modules
COPY --from=build-image /app/package*.json ./

CMD ["node", "dist/index.js"]
