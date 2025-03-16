# 빌드 스테이지
FROM public.ecr.aws/lambda/nodejs:20 as builder

# 작업 디렉토리 설정
WORKDIR /build

# Playwright 및 브라우저 의존성 설치
RUN dnf install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    alsa-lib

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 파일 복사 및 빌드
COPY function/ ./function/
COPY tsconfig.json ./
RUN npm run build

# Playwright 브라우저 설치
RUN npx playwright install chromium

# 프로덕션 스테이지
FROM public.ecr.aws/lambda/nodejs:20

# Playwright 필수 시스템 패키지 설치
RUN dnf install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    alsa-lib

# 프로덕션 의존성만 설치
COPY package*.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --only=production

# 빌드된 파일 복사
COPY --from=builder /build/dist ${LAMBDA_TASK_ROOT}/dist

# Playwright 브라우저 바이너리 복사
COPY --from=builder /root/.cache/ms-playwright ${LAMBDA_TASK_ROOT}/.cache/ms-playwright

# Lambda 핸들러 설정
CMD [ "dist/index.handler" ]
