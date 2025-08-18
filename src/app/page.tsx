'use client';

import { InitialPrompt } from '@/components/operator/InitialPrompt';
import { useRouter } from 'next/navigation';
import { id } from '@instantdb/core';
import { db } from '@/lib/instant/client';

export default function HomePage() {
  const router = useRouter();

  const handlePromptSubmit = async (prompt: string) => {
    // Create a new task
    const taskId = id();
    
    await db.transact([
      db.tx.tasks[taskId].update({
        name: prompt.slice(0, 100), // Use first 100 chars as name
        description: prompt,
        lastMessageAt: new Date(),
      })
    ]);
    
    // Navigate to the operator page with the task ID
    router.push(`/operator/${taskId}?prompt=${encodeURIComponent(prompt)}`);
  };

  return <InitialPrompt onSubmit={handlePromptSubmit} />;
}