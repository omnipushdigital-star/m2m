import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region:   'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  const key     = `sim-dumps/${month}.txt`
  const command = new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET!,
    Key:         key,
    ContentType: 'text/plain',
  })

  const url = await getSignedUrl(r2, command, { expiresIn: 3600 })
  return NextResponse.json({ url, key })
}
