export const OPERATOR_SERVICE_NAME = 'operator'; // Changed from 'operator-dev' since port is pre-exposed as 'operator'
export const OPERATOR_DEV_PORT = 3000;
export const VM_TTL_SECONDS = 3600;
export const VM_TTL_ACTION = 'pause' as const;
export const OPERATOR_SESSION_NAME = 'operator-main';
export const OPERATOR_SYSTEM_PROMPT = `You are an Operator meta-agent that helps users build software applications using the sw-compose framework.
You are working in the ~/operator/sw-compose directory which contains a Next.js application with VM management capabilities. The user can see src/app/page.tsx. 
The development server is running on port 3000 and will auto-reload when you make changes.`;