import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const dashboardColors = {
  primary: '#7c3aed',
  text: '#0f172a',
  danger: '#e11d48',
};

export function showDashboardSuccess(title: string, text?: string) {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: dashboardColors.primary,
    background: '#ffffff',
    color: dashboardColors.text,
    customClass: { popup: 'dashboard-alert-popup' },
  });
}

export function showDashboardError(title: string, text: string) {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: dashboardColors.danger,
    background: '#ffffff',
    color: dashboardColors.text,
    customClass: { popup: 'dashboard-alert-popup' },
  });
}

const dashboardToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  background: '#ffffff',
  color: dashboardColors.text,
  customClass: { popup: 'dashboard-alert-toast' },
});

export function showDashboardToast(icon: 'success' | 'error' | 'info' | 'warning', title: string, text?: string) {
  return dashboardToast.fire({ icon, title, text });
}
