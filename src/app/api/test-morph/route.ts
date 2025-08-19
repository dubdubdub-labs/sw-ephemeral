import { MorphCloudClient } from "morphcloud";
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const morph = new MorphCloudClient({
      apiKey: process.env.MORPH_API_KEY,
    });
    
    const instances = await morph.instances.list();
    
    return NextResponse.json({
      count: instances.length,
      instances: instances.map((i: any) => ({
        id: i.id,
        state: i.state,
        status: i.status,
        created_at: i.created_at,
        full: i
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}