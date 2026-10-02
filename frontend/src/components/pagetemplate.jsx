import NavigationButtons from '@/components/NavigationButtons';

export default function AllRecipes() {
  return (
    <div className="divide flex min-h-screen flex-col justify-between divide-y divide-solid divide-slate-300 border border-solid border-slate-300 bg-black font-[family-name:var(--font-geist-sans)]">
      <header className="h-10 bg-red-500">Header</header>
      <main className="flex-grow bg-green-500">Content</main>
      <footer className="flex h-[3vh] items-center justify-center bg-black">
        <NavigationButtons />
      </footer>
    </div>
  );
}
