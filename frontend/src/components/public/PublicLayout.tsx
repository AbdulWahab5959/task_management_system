import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function PublicLayout() {
  return (
    <div className="public-site min-h-screen text-white">
      <PublicNavbar />
      <main className="pt-16">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
