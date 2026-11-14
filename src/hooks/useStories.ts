import { useQuery } from '@tanstack/react-query';
import { fetchStories } from '@/api/stories';

export function useStories() {
  return useQuery({ queryKey: ['stories'], queryFn: fetchStories });
}
