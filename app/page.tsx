import Watchlist from "@/app/watchlist";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 border-x border-edge bg-surface px-8 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Token watchlist</h1>
      <Watchlist />
    </main>
  );
}
