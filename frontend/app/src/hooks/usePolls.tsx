import { useQuery } from '@tanstack/react-query';
import { FilterState } from '../components/PollFilters';

export const usePolls = (filters: FilterState) => {
  return useQuery({
    queryKey: ['polls', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters as any);
      const response = await fetch(`/api/polls?${params}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,  // 5 минут
    retry: 2,
  });
};