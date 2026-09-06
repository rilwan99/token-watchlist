import Watchlist from "@/app/watchlist";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 border-x border-edge bg-surface px-4 py-10 min-[480px]:px-8 min-[480px]:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-ink min-[480px]:text-3xl">
        Token watchlist
      </h1>
      <Watchlist />
    </main>
  );
}
