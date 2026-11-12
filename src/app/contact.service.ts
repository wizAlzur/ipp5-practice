import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Contact } from './contact';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly url = '/v1/contact';

  list() { return firstValueFrom(this.http.get<Contact[]>(this.url)); }
  create(contact: Contact) { return firstValueFrom(this.http.post<Contact>(this.url, contact)); }
  update(contact: Contact) { return firstValueFrom(this.http.put<Contact>(`${this.url}/${contact._id}`, contact)); }
  delete(id: string) { return firstValueFrom(this.http.delete<{ deletedId: string }>(`${this.url}/${id}`)); }
}
