import { Routes } from '@angular/router';
import { AvailabilityPage } from './bookings/availability.page';
import { MyBookingsPage } from './bookings/my-bookings.page';
import { RoomAdminPage } from './rooms/room-admin.page';
import { RoomListPage } from './rooms/room-list.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'availability' },
  { path: 'availability', component: AvailabilityPage, title: 'RoomBook · Availability' },
  { path: 'my-bookings', component: MyBookingsPage, title: 'RoomBook · My bookings' },
  { path: 'rooms', component: RoomListPage, title: 'RoomBook · Rooms' },
  { path: 'rooms/admin', component: RoomAdminPage, title: 'RoomBook · Manage rooms' },
  { path: '**', redirectTo: 'availability' },
];
