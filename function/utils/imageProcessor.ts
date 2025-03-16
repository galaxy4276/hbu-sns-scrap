import sharp from 'sharp';

export async function optimizeImageForGPT(imageBuffer: Buffer) {
  try {
    // 1. 이미지 리사이징 및 품질 조정
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(800, 600, { // 적절한 크기로 조정
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ // JPEG 포맷으로 변환 및 품질 조정
        quality: 70,
        mozjpeg: true
      })
      .toBuffer();

    // 2. Base64 변환
    const base64String = optimizedBuffer.toString('base64');
    
    return base64String;

  } catch (error) {
    console.error('Image optimization failed:', error);
    throw error;
  }
}
