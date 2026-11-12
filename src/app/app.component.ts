import { Component } from '@angular/core';
import { ContactListComponent } from './contact-list.component';

@Component({
  selector: 'app-root',
  imports: [ContactListComponent],
  template: `
    <header class="page-header">
      <div class="brand-mark" aria-hidden="true">К</div>
      <div><p class="eyebrow">КОНТАКТЫ</p><h1>Телефонный справочник</h1></div>
    </header>
    <main><app-contact-list /></main>
    <footer>Все нужные контакты в одном месте</footer>
  `
})
export class AppComponent {}
