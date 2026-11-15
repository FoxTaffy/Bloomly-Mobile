import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelRsvp, fetchEventAttendees, fetchMyRsvp, fetchUpcomingEvents, rsvpEvent } from '@/api/groups';

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export function useUpcomingEvents() {
  return useQuery({ queryKey: ['events', 'upcoming'], queryFn: fetchUpcomingEvents });
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

/** Моя отметка «Иду / Возможно» (веб: getMyRsvp). Нет отметки — null. */
export function useMyRsvp(id: string | undefined, enabled = true) {
  return useQuery({ queryKey: ['event-rsvp', id], queryFn: () => fetchMyRsvp(id!), enabled: enabled && !!id });
}

/** Повторное нажатие той же отметки снимает её (веб: setRsvp). */
export function useToggleRsvp(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ next, current }: { next: RsvpStatus; current: RsvpStatus | null }) => {
      if (current === next) await cancelRsvp(id!);
      else await rsvpEvent(id!, next);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-rsvp', id] });
      qc.invalidateQueries({ queryKey: ['event-attendees', id] });
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
