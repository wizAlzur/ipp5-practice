import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Contact, emptyContact } from './contact';

@Component({
  selector: 'app-contact-details',
  imports: [FormsModule],
  templateUrl: './contact-details.component.html'
})
export class ContactDetailsComponent implements OnChanges {
  @Input({ required: true }) contact!: Contact;
  @Input() busy = false;
  @Output() save = new EventEmitter<Contact>();
  @Output() remove = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  draft = emptyContact();
  confirmingDelete = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['contact']) {
      this.draft = structuredClone(this.contact);
      this.confirmingDelete = false;
    }
  }
}
