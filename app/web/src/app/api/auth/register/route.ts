import { NextResponse } from 'next/server';
import fetch from '@/lib/api-fetch'

type RegisterBody = {
  email: string;
  password: string;
  fullName: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;

    const apiUrl = process.env.API_INTERNAL_URL;

    if (!apiUrl) {
      return NextResponse.json(
        {
          message: 'API_INTERNAL_URL is not configured',
        },
        {
          status: 500,
        },
      );
    }

    const apiResponse = await fetch(
      `${apiUrl}/auth/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );

    const rawBody = await apiResponse.text();

    let responseBody: unknown = {};

    if (rawBody) {
      try {
        responseBody = JSON.parse(rawBody);
      } catch {
        responseBody = {
          message: rawBody,
        };
      }
    }

    return NextResponse.json(responseBody, {
      status: apiResponse.status,
    });
  } catch (error) {
    console.error('Register route error:', error);

    return NextResponse.json(
      {
        message: 'ไม่สามารถเชื่อมต่อกับระบบได้',
      },
      {
        status: 500,
      },
    );
  }
}