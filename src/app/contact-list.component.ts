import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Contact, emptyContact } from './contact';
import { ContactService } from './contact.service';
import { ContactDetailsComponent } from './contact-details.component';

@Component({
  selector: 'app-contact-list',
  imports: [ContactDetailsComponent],
  templateUrl: './contact-list.component.html'
})
export class ContactListComponent implements OnInit {
  private readonly service = inject(ContactService);
  readonly contacts = signal<Contact[]>([]);
  readonly selected = signal<Contact | null>(null);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('ru');
    return this.contacts().filter(c => `${c.username} ${c.email} ${c.telephone.mobile} ${c.telephone.home}`.toLocaleLowerCase('ru').includes(query));
  });

  ngOnInit() { void this.load(); }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try { this.contacts.set(await this.service.list()); }
    catch (error) { this.showError(error); }
    finally { this.loading.set(false); }
  }

  choose(contact: Contact) {
    this.selected.set(structuredClone(contact));
    this.error.set('');
    this.message.set('');
  }

  createNew() { this.choose(emptyContact()); }

  async save(contact: Contact) {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const saved = contact._id ? await this.service.update(contact) : await this.service.create(contact);
      const others = this.contacts().filter(c => c._id !== saved._id);
      this.contacts.set([...others, saved].sort((a, b) => a.username.localeCompare(b.username, 'ru')));
      this.selected.set(structuredClone(saved));
      this.message.set(contact._id ? 'Изменения сохранены.' : 'Контакт добавлен.');
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }

  async remove(id: string) {
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.service.delete(id);
      this.contacts.update(contacts => contacts.filter(c => c._id !== id));
      this.selected.set(null);
      this.message.set('Контакт удалён.');
    } catch (error) { this.showError(error); }
    finally { this.busy.set(false); }
  }

  cancel() { this.selected.set(null); this.error.set(''); this.message.set(''); }

  private showError(error: unknown) {
    if (error instanceof HttpErrorResponse) {
      const fields = error.error?.fields ? Object.values(error.error.fields).join(' ') : '';
      this.error.set(fields || error.error?.error || 'Не удалось связаться с сервером. Проверьте, что он запущен.');
    } else { this.error.set('Не удалось выполнить операцию. Попробуйте ещё раз.'); }
  }
}
