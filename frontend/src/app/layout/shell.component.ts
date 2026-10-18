import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HealthStatusComponent } from '../health/health-status.component';
import { IconComponent } from '../shared/icon.component';

/**
 * Responsive app shell. One navigation element, restyled by breakpoint:
 * bottom bar below 600 px, top bar from 600 px, side navigation above 1024 px.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HealthStatusComponent, IconComponent],
  template: `
    <a class="skip" href="#main">Skip to content</a>
    <div class="shell">
      <aside class="side">
        <div class="brand">RoomBook</div>
        <nav aria-label="Main">
          <a routerLink="/availability" routerLinkActive="active">
            <app-icon name="calendar" /><span>Availability</span>
          </a>
          <a routerLink="/my-bookings" routerLinkActive="active">
            <app-icon name="person" /><span>My bookings</span>
          </a>
          <a routerLink="/rooms" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <app-icon name="rooms" /><span>Rooms</span>
          </a>
          <a routerLink="/rooms/admin" routerLinkActive="active">
            <app-icon name="admin" /><span>Admin</span>
          </a>
        </nav>
        <div class="status">
          <app-health-status />
        </div>
      </aside>
      <div class="content">
        <main id="main" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
    .skip {
      position: absolute;
      left: var(--space-1);
      top: -4rem;
      z-index: 10;
      display: inline-flex;
      align-items: center;
      min-height: var(--touch-target);
      padding: 0 var(--space-2);
      background: var(--color-surface);
      color: var(--color-ink);
      border-radius: var(--radius-md);
    }
    .skip:focus {
      top: var(--space-1);
    }

    /* Phone (< 600 px): single column, brand on top, navigation fixed at the bottom */
    .shell {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh; /* dynamic viewport: stays above the browser bars on phones */
    }
    .side {
      display: contents;
    }
    .brand {
      order: 0;
      flex: none;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      min-height: var(--top-bar-height);
      padding: 0 var(--space-2);
      background: var(--color-ink);
      color: var(--color-on-ink);
      font-size: var(--font-size-title);
      font-weight: var(--font-weight-bold);
    }
    .status {
      position: absolute;
      top: 0;
      right: var(--space-2);
      z-index: 2;
      display: flex;
      align-items: center;
      height: var(--top-bar-height);
    }
    nav {
      order: 2;
      flex: none;
      display: flex;
      height: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px));
      padding-bottom: env(safe-area-inset-bottom, 0px);
      background: var(--color-surface);
      border-top: var(--border-thin);
      box-shadow: var(--elevation-2);
    }
    nav a {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.125rem;
      min-height: var(--touch-target);
      color: var(--color-ink-muted);
      font-size: var(--font-size-caption);
      text-decoration: none;
      border-top: 3px solid transparent;
    }
    nav a.active {
      color: var(--color-accent-strong);
      font-weight: var(--font-weight-bold);
      border-top-color: var(--color-accent);
    }
    .content {
      order: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    main {
      flex: 1;
      width: 100%;
      max-width: var(--content-max-width);
      margin: 0 auto;
      padding: var(--space-3) var(--space-2);
    }
    main:focus {
      outline: none;
    }

    /* Tablet (600-1024 px): top bar navigation */
    @media (min-width: 600px) {
      .shell {
        height: auto;
        min-height: 100vh;
      }
      .content {
        overflow: visible;
      }
      .side {
        display: flex;
        flex-wrap: wrap; /* on a narrow tablet the navigation drops to a second row instead of overflowing */
        align-items: center;
        justify-content: space-between;
        background: var(--color-ink);
        padding-right: var(--space-2);
      }
      .status {
        position: static;
        order: 1;
        height: auto;
        margin-left: var(--space-2);
      }
      nav {
        order: 2;
        margin-left: auto;
        height: auto;
        padding-bottom: 0;
        background: transparent;
        border: 0;
        box-shadow: none;
      }
      nav a {
        flex: none;
        flex-direction: row;
        gap: var(--space-1);
        padding: 0 var(--space-2);
        color: var(--color-on-ink);
        font-size: var(--font-size-body);
        border-top: 0;
        border-bottom: 3px solid transparent;
      }
      nav a.active {
        color: var(--color-on-ink);
        border-bottom-color: var(--color-on-ink);
      }
      nav a:focus-visible {
        outline-color: var(--color-on-ink);
      }
      main {
        padding: var(--space-4);
      }
    }

    /* Desktop (> 1024 px): side navigation */
    @media (min-width: 1024.02px) {
      .shell {
        flex-direction: row;
      }
      .side {
        position: sticky;
        top: 0;
        align-self: flex-start;
        height: 100vh;
        width: var(--side-nav-width);
        flex: none;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
      }
      .brand {
        padding: var(--space-3);
      }
      nav {
        order: 1;
        margin-left: 0;
        flex-direction: column;
        padding: var(--space-1) 0;
      }
      .status {
        order: 2;
        margin: auto 0 0;
        padding: var(--space-2) var(--space-3);
      }
      nav a {
        justify-content: flex-start; /* left-aligned, on the same line as the brand */
        padding: 0 var(--space-3) 0 calc(var(--space-3) - 3px); /* 3px is the active marker */
        border-bottom: 0;
        border-left: 3px solid transparent;
      }
      nav a.active {
        border-left-color: var(--color-on-ink);
        background: var(--color-on-ink-soft);
      }
      main {
        padding: var(--space-6) var(--space-4);
      }
    }
  `,
})
export class ShellComponent {}
