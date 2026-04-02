import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Events } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { Casino } from './pages/Casino';
import { Leaderboard } from './pages/Leaderboard';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'events', Component: Events },
      { path: 'events/:id', Component: EventDetail },
      { path: 'casino', Component: Casino },
      { path: 'leaderboard', Component: Leaderboard },
      { path: 'profile', Component: Profile },
      { path: 'admin', Component: Admin },
      { path: '*', Component: NotFound },
    ],
  },
]);