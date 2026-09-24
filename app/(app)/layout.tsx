import AppNav from '@/components/AppNav';

/* The member app's frame. The nav lives here rather than on each page so it
   stays put across navigation: a click swaps only the page beneath it, shows
   loading.tsx at once, and does not ask again who is signed in. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
