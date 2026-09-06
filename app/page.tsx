import Watchlist from "@/app/watchlist";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col bg-ground px-6 py-10 min-[480px]:py-16">
      <Watchlist />
    </main>
  );
}
