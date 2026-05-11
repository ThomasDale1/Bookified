import { auth } from '@clerk/nextjs/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const {userId} = await auth()
        if(!userId) {
            throw new Error('Unauthorized: User not authenticated')
        }
        return {
          allowedContentTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 50 * 1024 * 1024,
          tokenPayload: JSON.stringify({userId})
        };
      },
      onUploadCompleted: async ({blob, tokenPayload}) => {
        console.log('File uploaded to blob: ', blob.url)
        const payload = tokenPayload ? JSON.parse(tokenPayload): null
        const userId = payload?.userId
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
