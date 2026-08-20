import { api } from '../client';
import type {
  Attachment,
  Envelope,
  HistoryEntry,
  LocalFileRef,
  StaffTaskDetail,
  StaffTaskSummary,
} from '../types';

/**
 * A worker only ever sees their own *active* assignments. Access to operational
 * data disappears as soon as the assignment is revoked or completed — the API
 * responds with 403/404 and the frontend drops the task from the list.
 */
export const staffTasksApi = {
  list(): Promise<StaffTaskSummary[]> {
    return api
      .get<Envelope<StaffTaskSummary[]>>('/staff/assignments')
      .then((response) => response.data);
  },
  detail(assignmentId: number): Promise<StaffTaskDetail> {
    return api
      .get<Envelope<StaffTaskDetail>>(`/assignments/${assignmentId}/task`)
      .then((response) => response.data);
  },
  addNote(assignmentId: number, body: string): Promise<HistoryEntry> {
    return api
      .post<Envelope<HistoryEntry>>(`/assignments/${assignmentId}/notes`, { body })
      .then((response) => response.data);
  },
  addAttachment(assignmentId: number, file: LocalFileRef): Promise<Attachment> {
    const form = new FormData();

    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mime_type,
    } as unknown as Blob);
    form.append('type', file.type);

    return api
      .post<Envelope<Attachment>>(`/assignments/${assignmentId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data);
  },
};
