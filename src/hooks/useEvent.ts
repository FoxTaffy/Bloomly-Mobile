import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEvent, fetchEventAttendees, fetchUpcomingEvents, rsvpEvent } from '@/api/groups';

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export function useUpcomingEvents() {
  return useQuery({ queryKey: ['events', 'upcoming'], queryFn: fetchUpcomingEvents });
}

export function useEvent(id: string) {
  return useQuery({ queryKey: ['event', id], queryFn: () => fetchEvent(id), enabled: !!id, retry: false });
}

export function useEventAttendees(id: string | undefined) {
  return useQuery({ queryKey: ['event-attendees', id], queryFn: () => fetchEventAttendees(id!), enabled: !!id });
}

export function useRsvp(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: RsvpStatus) => rsvpEvent(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', 'upcoming'] });
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['event-attendees', id] });
    },
  });
}
