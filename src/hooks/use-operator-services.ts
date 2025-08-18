import { trpc } from '@/lib/trpc/client';
import { OPERATOR_SERVICE_NAME } from '@/lib/vm/constants';

export function useOperatorServices(instanceId: string | undefined) {
  const { data, isLoading } = trpc.morph.instances.get.useQuery(
    { instanceId: instanceId! },
    {
      enabled: !!instanceId,
      refetchInterval: 5000,
    }
  );
  
  const services = data?.networking?.httpServices || [];
  const operatorService = services.find(s => s.name === OPERATOR_SERVICE_NAME);
  
  const serviceUrl = operatorService 
    ? `https://${operatorService.name}-${instanceId?.replace(/_/g, '-')}.http.cloud.morph.so`
    : undefined;
  
  return {
    serviceUrl,
    isReady: !!serviceUrl,
    isLoading,
    status: data?.status,
  };
}